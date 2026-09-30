import { describe, expect, it } from 'vitest'
import { bangkokDay, calendarForFocus, createCalendarCache, CALENDAR_CACHE_MS } from './calendar-view.js'
import { buildAuthorizedCalendar } from '../../netlify/lib/calendar.mjs'

const now = Date.parse('2026-09-30T05:00:00Z')
const payload = (plan = { planId: 'free' }, serverNow = new Date(now).toISOString()) => ({ month: { days: [] }, plan, serverNow })

describe('calendar session cache', () => {
  it('reuses months for navigation and never persists them outside this instance', () => {
    const cache = createCalendarCache()
    cache.useContext('account-a/profile-1/free')
    const first = payload()
    cache.set('2026-9', first, now)
    cache.set('2026-10', payload(), now)
    expect(cache.get('2026-9', now + 30000)).toBe(first)
    cache.useContext('account-a/profile-1/free')
    expect(cache.get('2026-9', now + 60000)).toBe(first)
    expect(createCalendarCache().get('2026-9', now)).toBeNull()
    expect(cache.get('2026-9', now + CALENDAR_CACHE_MS)).toBeNull()
  })
  it.each(['account-b', 'profile-2', 'premium', 'new-day', 'logged-out'])('invalidates on changed security context: %s', context => {
    const cache = createCalendarCache()
    cache.useContext('original')
    cache.set('month', payload(), now)
    cache.useContext(context)
    expect(cache.get('month', now)).toBeNull()
  })
  it('expires at the server membership boundary', () => {
    const cache = createCalendarCache()
    cache.set('month', payload({ planId: 'premium', premiumExpiresAt: new Date(now + 60000).toISOString() }), now)
    expect(cache.get('month', now + 59999)).not.toBeNull()
    expect(cache.get('month', now + 60000)).toBeNull()
  })
  it('expires at Bangkok midnight using server time even if client clock differs', () => {
    const cache = createCalendarCache()
    cache.set('month', payload(undefined, '2026-09-30T16:59:30Z'), now)
    expect(cache.get('month', now + 29999)).not.toBeNull()
    expect(cache.get('month', now + 30000)).toBeNull()
    expect(bangkokDay('2026-09-30T17:00:00Z')).toBe('2026-10-01')
  })
})

describe('local topic selection from authorized server data', () => {
  it('matches server topic scores/readings without recalculating or revealing locked days', () => {
    const args = { profile: { birth_date: '1989-08-26', birth_time: '11:30:00', gender: 'male', timezone_id: 'Asia/Bangkok', profile_version: 1 }, entitlement: null, now: new Date(now) }
    const all = buildAuthorizedCalendar({ ...args, request: { year: 2026, month: 9, focus: 'all' } }).month
    expect(calendarForFocus(all, 'all')).toBe(all)
    for (const focus of ['work', 'money', 'love', 'communication', 'wellbeing']) {
      const projected = calendarForFocus(all, focus)
      const direct = buildAuthorizedCalendar({ ...args, request: { year: 2026, month: 9, focus } }).month
      expect(projected.days).toEqual(direct.days)
      expect(projected.days[0]).not.toHaveProperty('personalScore')
    }
    expect(all.days[29].topicReadings).toHaveLength(5)
  })
})
