import { requiredEnvironment, verifyLineIdToken, createSupabaseRest } from './line-session.mjs'
import { validateCalendarRequest, buildAuthorizedCalendar } from '../lib/calendar.mjs'

const respond = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'Netlify-CDN-Cache-Control': 'no-store' } })
export default async function calendar(request) {
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)
  try {
    const raw = await request.text()
    if (raw.length > 16384) return respond({ error: 'คำขอใหญ่เกินไป' }, 413)
    let body
    try { body = JSON.parse(raw) } catch { return respond({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, 400) }
    const input = validateCalendarRequest(body)
    const config = requiredEnvironment()
    const identity = await verifyLineIdToken(body.idToken, config.channelId)
    const rest = createSupabaseRest(config)
    const [user] = await rest(`app_users?line_user_id=eq.${encodeURIComponent(identity.sub)}&select=id&limit=1`)
    if (!user) return respond({ error: 'กรุณาเข้าสู่ระบบและบันทึกข้อมูลเกิดก่อน' }, 403)
    const userId = encodeURIComponent(user.id)
    const [[storedEntitlement], [profile]] = await Promise.all([
      rest(`user_entitlements?user_id=eq.${userId}&select=plan_id,billing_cycle,premium_expires_at,next_membership&limit=1`),
      rest(`birth_profiles?user_id=eq.${userId}&select=birth_date,birth_time,gender,timezone_id,profile_version&limit=1`)
    ])
    const entitlement = storedEntitlement?.next_membership && new Date(storedEntitlement.next_membership.startsAt) <= new Date()
      ? await rest('rpc/activate_annual_membership', { method: 'POST', body: { p_user_id: user.id } }) : storedEntitlement
    if (!profile) return respond({ error: 'กรุณาบันทึกข้อมูลเกิดก่อนดูปฏิทิน' }, 409)
    if (!profile.birth_time || !['male', 'female'].includes(profile.gender)) return respond({ error: 'กรุณาระบุเวลาเกิดและเพศในโปรไฟล์ก่อนใช้ปาจื้อและปฏิทิน' }, 409)
    return respond(buildAuthorizedCalendar({ profile, entitlement, request: input }))
  } catch (error) {
    const auth = /LINE ID token|token verification/.test(error.message)
    const invalid = error.message === 'calendar_invalid_request'
    const range = error.message === 'calendar_out_of_range'
    console.error('calendar request failed', { kind: auth ? 'auth' : invalid ? 'validation' : range ? 'range' : 'server' })
    return respond({ error: auth ? 'กรุณาเชื่อมต่อ LINE อีกครั้ง' : invalid ? 'คำขอปฏิทินไม่ถูกต้อง' : range ? 'วันที่อยู่นอกช่วงที่เปิดให้ดู' : 'โหลดปฏิทินไม่ได้ กรุณาลองใหม่' }, auth ? 401 : invalid ? 400 : range ? 403 : 500)
  }
}
export const config = { path: '/api/calendar' }
