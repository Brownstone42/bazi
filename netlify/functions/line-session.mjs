import { createHash } from 'node:crypto'

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }
const relationships = new Set(['interest', 'partner', 'spouse', 'parent', 'child', 'sibling', 'friend', 'boss', 'colleague', 'subordinate', 'business_partner', 'client'])
const focuses = new Set(['love', 'family', 'work', 'friendship', 'overview'])

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders })
}

function requiredEnvironment() {
  const config = {
    channelId: process.env.LINE_CHANNEL_ID,
    supabaseUrl: process.env.SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  }
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)
  if (missing.length) throw new Error(`Missing server configuration: ${missing.join(', ')}`)
  return config
}

export async function verifyLineIdToken(idToken, channelId, fetchImpl = fetch) {
  if (!idToken) throw new Error('Missing LINE ID token')
  const response = await fetchImpl('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId })
  })
  const payload = await response.json()
  if (!response.ok || payload.aud !== channelId || !payload.sub) {
    throw new Error('LINE ID token verification failed')
  }
  return payload
}

function createSupabaseRest(config, fetchImpl = fetch) {
  return async function request(path, { method = 'GET', body, prefer } = {}) {
    const response = await fetchImpl(`${config.supabaseUrl}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: config.secretKey,
        ...(config.secretKey.startsWith('eyJ') ? { authorization: `Bearer ${config.secretKey}` } : {}),
        'content-type': 'application/json',
        ...(prefer ? { prefer } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
    if (!response.ok) {
      const details = await response.text().catch(() => '')
      throw new Error(`Database request failed (${response.status}): ${details.slice(0, 1200)}`)
    }
    if (response.status === 204) return null
    return response.json()
  }
}

function isoBirthDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '')
  if (!match) throw new Error('Invalid birth date')
  const [, day, month, year] = match
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`)
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== Number(month) || parsed.getUTCDate() !== Number(day)) {
    throw new Error('Invalid birth date')
  }
  return `${year}-${month}-${day}`
}

function displayBirthDate(value) {
  const [year, month, day] = String(value ?? '').slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : ''
}

export function normalizeBirthProfile(profile) {
  if (!profile) return null
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(profile.birthTime ?? '')) throw new Error('Invalid birth time')
  if (!['male', 'female'].includes(profile.gender)) throw new Error('Invalid gender')
  try {
    new Intl.DateTimeFormat('en', { timeZone: profile.timezoneId }).format()
  } catch {
    throw new Error('Invalid timezone')
  }
  return {
    birth_date: isoBirthDate(profile.birthDate),
    birth_time: profile.birthTime,
    gender: profile.gender,
    timezone_id: profile.timezoneId
  }
}

export function normalizeComparisonProfile(profile) {
  if (!profile) throw new Error('Invalid comparison profile')
  const name = String(profile.name || 'อีกฝ่าย').trim().slice(0, 80) || 'อีกฝ่าย'
  const birthTime = profile.birthTime || null
  if (birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) throw new Error('Invalid comparison time')
  if (!['male', 'female'].includes(profile.gender)) throw new Error('Invalid comparison gender')
  if (!relationships.has(profile.relationship) || !focuses.has(profile.focus)) throw new Error('Invalid comparison context')
  try {
    new Intl.DateTimeFormat('en', { timeZone: profile.timezoneId }).format()
  } catch {
    throw new Error('Invalid comparison timezone')
  }
  return {
    person_name: name,
    birth_date: isoBirthDate(profile.birthDate),
    birth_time: birthTime,
    gender: profile.gender,
    timezone_id: profile.timezoneId,
    relationship: profile.relationship,
    focus: profile.focus
  }
}

export function comparisonFingerprint(profile) {
  const identity = [
    profile.birth_date, profile.birth_time || 'unknown', profile.gender, profile.timezone_id,
    profile.relationship, profile.focus
  ].join('|')
  return createHash('sha256').update(identity).digest('hex')
}

function firstDayOfCurrentMonth() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  return `${year}-${month}-01`
}

async function readAccount(rest, userId) {
  let [entitlement] = await rest(`user_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`)
  const currentPeriod = firstDayOfCurrentMonth()
  const premiumExpired = entitlement.plan_id === 'premium' && entitlement.premium_expires_at && new Date(entitlement.premium_expires_at) <= new Date()
  const shouldResetPremiumQuota = entitlement.plan_id === 'premium' && entitlement.comparison_period_start !== currentPeriod
  if (premiumExpired || shouldResetPremiumQuota) {
    const updates = {
      ...(premiumExpired ? { plan_id: 'free', premium_started_at: null, premium_expires_at: null } : {}),
      ...(shouldResetPremiumQuota ? { included_comparison_used: 0, comparison_period_start: currentPeriod } : {})
    }
    ;[entitlement] = await rest(`user_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
      method: 'PATCH', body: updates, prefer: 'return=representation'
    })
  }
  const [birthProfile] = await rest(`birth_profiles?user_id=eq.${encodeURIComponent(userId)}&select=birth_date,birth_time,gender,timezone_id&limit=1`)
  let comparisonReports = []
  try {
    comparisonReports = await rest(`comparison_reports?user_id=eq.${encodeURIComponent(userId)}&select=id,person_name,birth_date,birth_time,gender,timezone_id,relationship,focus,quota_source,result_json,created_at&order=created_at.desc&limit=20`)
  } catch {
    // รองรับช่วง deploy ก่อนที่ migration รายการเปรียบเทียบจะถูกรัน
  }
  return { entitlement, birthProfile: birthProfile ?? null, comparisonReports }
}

function entitlementPayload(entitlement) {
  return {
    planId: entitlement.plan_id,
    premiumExpiresAt: entitlement.premium_expires_at ?? null,
    includedComparisonUsed: entitlement.plan_id === 'premium'
      ? entitlement.included_comparison_used
      : entitlement.free_comparison_used ? 1 : 0,
    purchasedComparisonCredits: entitlement.purchased_comparison_credits
  }
}

function reportPayload(report) {
  return {
    id: report.id,
    name: report.person_name,
    birthDate: displayBirthDate(report.birth_date),
    birthTime: report.birth_time ? String(report.birth_time).slice(0, 5) : '',
    gender: report.gender,
    timezoneId: report.timezone_id,
    relationship: report.relationship,
    focus: report.focus,
    quotaSource: report.quota_source,
    result: report.result_json ?? null,
    createdAt: report.created_at
  }
}

async function reserveComparison(rest, userId, rawProfile) {
  const profile = normalizeComparisonProfile(rawProfile)
  const [reservation] = await rest('rpc/reserve_comparison_report', {
    method: 'POST',
    body: {
      p_user_id: userId,
      p_fingerprint: comparisonFingerprint(profile),
      p_person_name: profile.person_name,
      p_birth_date: profile.birth_date,
      p_birth_time: profile.birth_time,
      p_gender: profile.gender,
      p_timezone_id: profile.timezone_id,
      p_relationship: profile.relationship,
      p_focus: profile.focus
    }
  })
  const allowed = Boolean(reservation?.report_id)
  return {
    allowed,
    existing: allowed && reservation.is_existing,
    report: allowed ? {
      id: reservation.report_id,
      name: profile.person_name,
      birthDate: displayBirthDate(profile.birth_date),
      birthTime: profile.birth_time || '',
      gender: profile.gender,
      timezoneId: profile.timezone_id,
      relationship: profile.relationship,
      focus: profile.focus,
      quotaSource: reservation.source,
      result: reservation.saved_result ?? null
    } : null,
    entitlement: {
      planId: reservation.current_plan,
      premiumExpiresAt: null,
      includedComparisonUsed: reservation.included_used,
      purchasedComparisonCredits: reservation.purchased_remaining
    }
  }
}

async function saveComparisonResult(rest, userId, reportId, result) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportId ?? '')) {
    throw new Error('Invalid comparison report')
  }
  if (!result || Array.isArray(result) || typeof result !== 'object') throw new Error('Invalid comparison result')
  const serialized = JSON.stringify(result)
  if (serialized.length > 30000) throw new Error('Comparison result is too large')
  const reports = await rest(
    `comparison_reports?id=eq.${encodeURIComponent(reportId)}&user_id=eq.${encodeURIComponent(userId)}&select=id,person_name,birth_date,birth_time,gender,timezone_id,relationship,focus,quota_source,result_json,created_at`,
    {
      method: 'PATCH',
      body: { result_json: result, updated_at: new Date().toISOString() },
      prefer: 'return=representation'
    }
  )
  if (!reports?.[0]) throw new Error('Comparison report not found')
  return reportPayload(reports[0])
}

export default async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const config = requiredEnvironment()
    const body = await request.json()
    const lineProfile = await verifyLineIdToken(body.idToken, config.channelId)
    const rest = createSupabaseRest(config)
    const now = new Date().toISOString()
    const [user] = await rest('app_users?on_conflict=line_user_id&select=id,display_name,picture_url', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: {
        line_user_id: lineProfile.sub,
        display_name: lineProfile.name || 'ผู้ใช้ LINE',
        picture_url: lineProfile.picture || null,
        last_login_at: now,
        updated_at: now
      }
    })

    await rest('user_entitlements?on_conflict=user_id', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: { user_id: user.id }
    })

    if (body.action === 'reserveComparison') {
      return jsonResponse(await reserveComparison(rest, user.id, body.comparisonProfile))
    }

    if (body.action === 'saveComparisonResult') {
      return jsonResponse({ report: await saveComparisonResult(rest, user.id, body.reportId, body.result) })
    }

    if (body.action && body.action !== 'sync') return jsonResponse({ error: 'ไม่รู้จักคำสั่งที่ส่งมา' }, 400)

    const birthProfile = normalizeBirthProfile(body.birthProfile)
    if (birthProfile) {
      await rest('birth_profiles?on_conflict=user_id', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: { user_id: user.id, ...birthProfile, updated_at: now }
      })
    }

    const account = await readAccount(rest, user.id)
    return jsonResponse({
      user: { id: user.id, displayName: user.display_name, pictureUrl: user.picture_url },
      entitlement: entitlementPayload(account.entitlement),
      birthProfile: account.birthProfile,
      comparisonReports: account.comparisonReports.map(reportPayload)
    })
  } catch (error) {
    console.error('line-session failed', {
      message: error instanceof Error ? error.message : String(error)
    })
    const configurationError = error instanceof Error && error.message.startsWith('Missing server configuration')
    const authenticationError = error instanceof Error && (
      error.message.includes('LINE ID token') || error.message.includes('token verification')
    )
    const validationError = error instanceof Error && error.message.startsWith('Invalid')
    const message = configurationError
      ? 'ระบบฐานข้อมูลยังตั้งค่าไม่ครบ'
      : authenticationError
        ? 'ไม่สามารถยืนยันบัญชีผู้ใช้ได้'
        : validationError
          ? 'ข้อมูลที่ส่งมาไม่ถูกต้อง'
          : 'ระบบยังบันทึกข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง'
    return jsonResponse({ error: message }, configurationError ? 503 : authenticationError ? 401 : validationError ? 400 : 500)
  }
}

export const config = { path: '/api/line-session' }
