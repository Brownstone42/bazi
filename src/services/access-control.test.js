import { describe, expect, it } from 'vitest'
import {
  calendarMonthAccess,
  canAccessCalendarDay,
  canAccessLuckCycle,
  comparisonLimitForPlan
} from './access-control'

describe('access control', () => {
  it('keeps past and current luck cycles free while locking the future', () => {
    const current = { index: 3 }
    expect(canAccessLuckCycle({ index: 1 }, current, 'free')).toBe(true)
    expect(canAccessLuckCycle({ index: 3 }, current, 'free')).toBe(true)
    expect(canAccessLuckCycle({ index: 4 }, current, 'free')).toBe(false)
    expect(canAccessLuckCycle({ index: 4 }, current, 'premium')).toBe(true)
  })

  it('keeps only today free in the daily calendar', () => {
    expect(canAccessCalendarDay({ isToday: true }, 'free')).toBe(true)
    expect(canAccessCalendarDay({ isToday: false }, 'free')).toBe(false)
    expect(canAccessCalendarDay({ isToday: false }, 'premium')).toBe(true)
  })

  it('allows premium to see this month and next month only', () => {
    const now = new Date(2026, 8, 24)
    expect(calendarMonthAccess(2026, 9, 'free', now)).toBe('available')
    expect(calendarMonthAccess(2026, 10, 'free', now)).toBe('premium')
    expect(calendarMonthAccess(2026, 10, 'premium', now)).toBe('available')
    expect(calendarMonthAccess(2026, 11, 'premium', now)).toBe('unavailable')
  })

  it('uses the agreed comparison quotas', () => {
    expect(comparisonLimitForPlan('free')).toBe(1)
    expect(comparisonLimitForPlan('premium')).toBe(5)
    expect(comparisonLimitForPlan('comparison')).toBe(5)
  })
})
