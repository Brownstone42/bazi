import { describe, expect, it, vi } from 'vitest'
import { fetchPersonalCalendar } from './calendar-api'

describe('calendar API client', () => {
  it('sends only identity and requested month/topic, never a plan or birth profile', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ month: { days: [] }, plan: { planId: 'free' }, serverNow: '2026-09-30T00:00:00Z' }) }))
    await fetchPersonalCalendar({ idToken: 'token', year: 2026, month: 9, focus: 'all', planId: 'premium', now: 'forged', birthProfile: {}, fetchImpl })
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/calendar')
    expect(options.cache).toBe('no-store')
    expect(JSON.parse(options.body)).toEqual({ idToken: 'token', year: 2026, month: 9, focus: 'all' })
  })
  it('does not calculate or return local fallback after server failure', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'กรุณาเชื่อมต่อ LINE อีกครั้ง' }) }))
    await expect(fetchPersonalCalendar({ idToken: 'token', fetchImpl })).rejects.toThrow('กรุณาเชื่อมต่อ LINE อีกครั้ง')
    await expect(fetchPersonalCalendar({ fetchImpl })).rejects.toThrow('เข้าสู่ระบบ')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
