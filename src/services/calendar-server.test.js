// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuthorizedCalendar } from '../../netlify/lib/calendar.mjs'
import handler from '../../netlify/functions/calendar.mjs'
const mocks = vi.hoisted(() => ({ verify: vi.fn(), rest: vi.fn() }))
vi.mock('../../netlify/functions/line-session.mjs', () => ({
  requiredEnvironment: () => ({ channelId: 'test-channel' }),
  verifyLineIdToken: (...args) => mocks.verify(...args),
  createSupabaseRest: () => mocks.rest
}))
const now = new Date('2026-09-30T05:00:00Z')
const profile = { birth_date: '1989-08-26', birth_time: '11:30:00', gender: 'male', timezone_id: 'Asia/Bangkok', profile_version: 1 }
const premium = { plan_id: 'premium', billing_cycle: 'monthly', premium_expires_at: '2026-10-29T00:00:00Z' }
const request = { year: 2026, month: 9, focus: 'all' }
const call = (body = {}, method = 'POST') => handler(new Request('https://example.com/api/calendar', { method, ...(method === 'POST' ? { body: JSON.stringify({ idToken: 'test-token', ...request, ...body }) } : {}) }))

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now)
  mocks.verify.mockReset().mockResolvedValue({ sub: 'verified-user' })
  mocks.rest.mockReset().mockImplementation(async path => {
    if (path.startsWith('app_users?')) return [{ id: 'owner-only' }]
    if (path.startsWith('user_entitlements?')) return [{ plan_id: 'free' }]
    if (path.startsWith('birth_profiles?')) return [profile]
    throw new Error('Unexpected request')
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('server-authorized calendar', () => {
  it('Free receives only today; other dates contain no scores, stars or nested predictions', async () => {
    const response = await call()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    const result = await response.json()
    expect(result.month.days.filter(day => day.access === 'available')).toHaveLength(1)
    expect(result.month.days.at(-1)).toMatchObject({ key: '2026-09-30', access: 'available', personalScore: expect.any(Number) })
    for (const day of result.month.days.slice(0, -1)) expect(Object.keys(day).sort()).toEqual(['access', 'day', 'isToday', 'key', 'weekday'])
    expect(result.month).not.toHaveProperty('recommended')
    expect(result.month).not.toHaveProperty('counts')
    expect(mocks.rest.mock.calls[0][0]).toContain('line_user_id=eq.verified-user')
    expect(mocks.rest.mock.calls.slice(1).every(([path]) => path.includes('user_id=eq.owner-only'))).toBe(true)
    expect(mocks.rest.mock.calls.every(args => args.length === 1)).toBe(true)
  })
  it('does not leak next-month content to Free', async () => {
    const result = await (await call({ month: 10 })).json()
    expect(result.month.days.every(day => day.access === 'premium' && !('personalScore' in day) && !('topicReadings' in day))).toBe(true)
  })
  it('enforces inclusive 30-day monthly and 90-day annual boundaries', () => {
    const monthly = buildAuthorizedCalendar({ profile, entitlement: premium, now, request: { ...request, month: 10 } })
    expect(monthly.month.days[29]).toMatchObject({ key: '2026-10-30', access: 'available' })
    expect(monthly.month.days[30]).toEqual(expect.objectContaining({ key: '2026-10-31', access: 'premium' }))
    expect(monthly.month.days[30]).not.toHaveProperty('summary')
    const yearly = buildAuthorizedCalendar({ profile, entitlement: { ...premium, billing_cycle: 'yearly' }, now, request: { ...request, month: 12 } })
    expect(yearly.month.days[28]).toMatchObject({ key: '2026-12-29', access: 'available' })
    expect(yearly.month.days[29]).toMatchObject({ key: '2026-12-30', access: 'unavailable' })
    expect(yearly.month.days[29]).not.toHaveProperty('personalScore')
  })
  it.each([null, {}, { ...premium, premium_expires_at: null }, { ...premium, premium_expires_at: now.toISOString() }, { ...premium, premium_expires_at: 'bad' }, { ...premium, billing_cycle: 'forged' }])('fails closed for expired or invalid membership %j', entitlement => {
    const result = buildAuthorizedCalendar({ profile, entitlement, now, request: { ...request, month: 10 } })
    expect(result.daysAhead).toBe(0)
    expect(result.month.days.every(day => !('personalScore' in day))).toBe(true)
  })
  it('uses Bangkok date rather than browser time or birth timezone for free access', () => {
    const result = buildAuthorizedCalendar({ profile: { ...profile, timezone_id: 'America/Los_Angeles' }, entitlement: null, now: new Date('2026-09-30T17:00:00Z'), request: { ...request, month: 10 } })
    expect(result.month.days[0]).toMatchObject({ key: '2026-10-01', isToday: true, access: 'available' })
    expect(result.month.days[1].access).toBe('premium')
  })
  it.each([{ userId: 'other' }, { planId: 'premium' }, { now: '2026-10-15' }, { birthProfile: profile }, { localPreview: true }, { month: 13 }, { month: 1.5 }, { focus: 'invalid' }, { year: '2026' }])('rejects forged or malformed request %j', async body => {
    expect((await call(body)).status).toBe(400)
    expect(mocks.rest).not.toHaveBeenCalled()
  })
  it('requires LINE authentication before reading any account data', async () => {
    mocks.verify.mockRejectedValue(new Error('LINE ID token verification failed'))
    expect((await call()).status).toBe(401)
    expect(mocks.rest).not.toHaveBeenCalled()
  })
  it('rejects past-only and beyond-90-day months', async () => {
    expect((await call({ month: 8 })).status).toBe(403)
    expect((await call({ year: 2027, month: 1 })).status).toBe(403)
  })
  it('does not fall back to caller birth data when no saved profile exists', async () => {
    mocks.rest.mockImplementation(async path => path.startsWith('app_users?') ? [{ id: 'owner-only' }] : [])
    expect((await call()).status).toBe(409)
  })
  it('returns a generic error without leaking database details', async () => {
    mocks.rest.mockRejectedValue(new Error('private database details'))
    const response = await call()
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('private database details')
    expect((await call({}, 'GET')).status).toBe(405)
  })
})
