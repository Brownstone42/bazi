import { createHash } from 'node:crypto'
import { buildComparisonReading } from '../../src/services/comparison-reading.js'
import { calculateChart, calculateChartWithOptionalTime } from '../../src/services/bazi.js'

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store', 'Netlify-CDN-Cache-Control': 'no-store' }
const relationships = new Set(['unspecified', 'interest', 'partner', 'spouse', 'parent', 'child', 'sibling', 'friend', 'boss', 'colleague', 'subordinate', 'business_partner', 'client'])
const focuses = new Set(['love', 'family', 'work', 'friendship', 'overview'])

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders })
}

export function requiredEnvironment() {
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

export function createSupabaseRest(config, fetchImpl = fetch) {
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
    const responseText = await response.text()
    return responseText ? JSON.parse(responseText) : null
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

function firstDayOfCurrentMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit'
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  return `${year}-${month}-01`
}

export async function readAccount(rest, userId, now = new Date()) {
  let [entitlement] = await rest(`user_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`)
  if (entitlement?.next_membership && new Date(entitlement.next_membership.startsAt) <= now) entitlement = await rest('rpc/activate_annual_membership', { method: 'POST', body: { p_user_id: userId } })
  const currentPeriod = firstDayOfCurrentMonth(now)
  const premiumExpired = entitlement.plan_id === 'premium' && entitlement.premium_expires_at && new Date(entitlement.premium_expires_at) <= now
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
  const [birthProfile] = await rest(`birth_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`)
  let comparisonReports = []
  try {
    comparisonReports = await rest(`comparison_reports?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=20`)
  } catch {
    // รองรับช่วง deploy ก่อนที่ migration รายการเปรียบเทียบจะถูกรัน
  }
  return { entitlement, birthProfile: birthProfile ?? null, comparisonReports }
}

function entitlementPayload(entitlement) {
  return {
    planId: entitlement.plan_id,
    billingCycle: entitlement.billing_cycle ?? 'monthly',
    billingPaymentMethod: entitlement.billing_payment_method ?? 'card',
    premiumExpiresAt: entitlement.premium_expires_at ?? null,
    nextMembership: entitlement.next_membership ?? null,
    includedComparisonUsed: entitlement.plan_id === 'premium'
      ? entitlement.included_comparison_used
      : entitlement.free_comparison_used ? 1 : 0,
    purchasedComparisonCredits: entitlement.purchased_comparison_credits
  }
}

export function reportPayload(report, currentVersion) {
  return {
    id: report.id,
    ownerProfileVersion: report.owner_profile_version ?? null,
    ownerBirthSnapshot: report.owner_birth_snapshot ?? null,
    isStale: report.owner_profile_version == null || (currentVersion != null && report.owner_profile_version !== currentVersion),
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

export async function reserveComparison(rest, userId, rawProfile, expectedVersion) {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error('Invalid profile version')
  const profile = normalizeComparisonProfile(rawProfile)
  const [owner] = await rest(`birth_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`)
  if (!owner || owner.profile_version !== expectedVersion) throw new Error('profile_version_changed')
  const [membership] = await rest(`user_entitlements?user_id=eq.${encodeURIComponent(userId)}&select=next_membership&limit=1`)
  if (membership?.next_membership && new Date(membership.next_membership.startsAt) <= new Date()) await rest('rpc/activate_annual_membership', { method: 'POST', body: { p_user_id: userId } })
  const toInput = row => ({ birthDate: row.birth_date, birthTime: row.birth_time?.slice(0, 5) || '', gender: row.gender, timezoneId: row.timezone_id,
    relationship: row.relationship, focus: row.focus })
  // Validate dates before reserving a credit. All actual readings use stored owner data.
  calculateChartWithOptionalTime(toInput(profile))
  calculateChart(toInput(owner))
  const [reservation] = await rest('rpc/reserve_comparison_report_v2', {
    method: 'POST',
    body: {
      p_user_id: userId,
      p_expected_version: expectedVersion,
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
  let savedReport = allowed
    ? (await rest(`comparison_reports?id=eq.${encodeURIComponent(reservation.report_id)}&user_id=eq.${encodeURIComponent(userId)}&select=*`))[0]
    : null
  if (allowed) {
    if (!savedReport) throw new Error('Comparison report not found')
    if (savedReport.owner_profile_version !== expectedVersion) throw new Error('profile_version_changed')
    if (savedReport.result_json?.readingVersion !== 'server-v1' || !savedReport.result_json?.topicResults) {
      const result = buildComparisonReading(toInput(owner), toInput(savedReport))
      const [updated] = await rest(`comparison_reports?id=eq.${encodeURIComponent(savedReport.id)}&user_id=eq.${encodeURIComponent(userId)}&owner_profile_version=eq.${expectedVersion}&select=*`, {
        method: 'PATCH', body: { result_json: result, updated_at: new Date().toISOString() }, prefer: 'return=representation'
      })
      if (!updated) throw new Error('Comparison report not found')
      savedReport = updated
    }
  }
  return {
    allowed,
    existing: allowed && reservation.is_existing,
    report: savedReport ? reportPayload(savedReport, expectedVersion) : allowed ? {
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
      includedComparisonUsed: reservation.included_used,
      purchasedComparisonCredits: reservation.purchased_remaining
    }
  }
}

export default async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const config = requiredEnvironment()
    const body = await request.json()
    const lineProfile = await verifyLineIdToken(body.idToken, config.channelId)
    if (body.action === 'saveComparisonResult') return jsonResponse({ error: 'กรุณาเปิดแอปใหม่เพื่อใช้ระบบเปรียบเทียบเวอร์ชันล่าสุด' }, 410)
    if (body.action === 'reserveComparison' && Object.keys(body).some(key => !['idToken', 'action', 'comparisonProfile', 'profileVersion'].includes(key))) {
      return jsonResponse({ error: 'คำขอเปรียบเทียบไม่ถูกต้อง' }, 400)
    }
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
      return jsonResponse(await reserveComparison(rest, user.id, body.comparisonProfile, body.profileVersion))
    }

    if (body.action && body.action !== 'sync') return jsonResponse({ error: 'ไม่รู้จักคำสั่งที่ส่งมา' }, 400)

    const birthProfile = normalizeBirthProfile(body.birthProfile)
    if (birthProfile) {
      const saved = await rest('rpc/save_birth_profile', {
        method: 'POST',
        body: { p_user_id: user.id, p_birth_date: birthProfile.birth_date, p_birth_time: birthProfile.birth_time,
          p_gender: birthProfile.gender, p_timezone_id: birthProfile.timezone_id }
      })
      if (!saved?.allowed) return jsonResponse({ error: 'แก้ข้อมูลเกิดได้ 1 ครั้งต่อ 30 วัน กรุณารอถึงวันที่แก้ไขได้อีกครั้ง', nextEditAt: saved?.nextEditAt }, 409)
    }

    const account = await readAccount(rest, user.id)
    return jsonResponse({
      user: { id: user.id, displayName: user.display_name, pictureUrl: user.picture_url },
      entitlement: entitlementPayload(account.entitlement),
      birthProfile: account.birthProfile,
      nextBirthEditAt: account.birthProfile?.last_birth_edit_at
        ? new Date(new Date(account.birthProfile.last_birth_edit_at).getTime() + 30 * 86400000).toISOString() : null,
      comparisonReports: account.comparisonReports.map(report => reportPayload(report, account.birthProfile?.profile_version))
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('profile_version_changed')) {
      return jsonResponse({ error: 'ข้อมูลเกิดเปลี่ยนแล้ว กรุณารีเฟรชหน้าและเปรียบเทียบใหม่ รายงานเดิมยังเก็บไว้และไม่คืนโควต้า' }, 409)
    }
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
