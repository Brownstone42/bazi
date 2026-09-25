const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' }

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
    if (!response.ok) throw new Error(`Database request failed (${response.status})`)
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

function firstDayOfCurrentMonth() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
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
  return { entitlement, birthProfile: birthProfile ?? null }
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
      entitlement: {
        planId: account.entitlement.plan_id,
        premiumExpiresAt: account.entitlement.premium_expires_at,
        includedComparisonUsed: account.entitlement.plan_id === 'premium'
          ? account.entitlement.included_comparison_used
          : account.entitlement.free_comparison_used ? 1 : 0,
        purchasedComparisonCredits: account.entitlement.purchased_comparison_credits
      },
      birthProfile: account.birthProfile
    })
  } catch (error) {
    const configurationError = error instanceof Error && error.message.startsWith('Missing server configuration')
    return jsonResponse({ error: configurationError ? 'ระบบฐานข้อมูลยังตั้งค่าไม่ครบ' : 'ไม่สามารถยืนยันบัญชีผู้ใช้ได้' }, configurationError ? 503 : 401)
  }
}

export const config = { path: '/api/line-session' }
