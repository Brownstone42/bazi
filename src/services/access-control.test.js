import { describe, expect, it } from 'vitest'
import {
  calendarMonthAccess,
  calendarDayAccess,
  calendarPlanForSession,
  canAccessCalendarDay,
  canAccessLuckCycle,
  comparisonBalance,
  comparisonLimitForPlan,
  consumeComparison
} from './access-control'

describe('access control', () => {
  it('distinguishes Premium dates from dates that no package unlocks', () => {
    const now = new Date('2026-09-28T05:00:00Z')
    expect(calendarDayAccess({ key: '2026-09-27' }, 'free', now)).toBe('unavailable')
    expect(calendarDayAccess({ key: '2026-12-28' }, 'premium', now)).toBe('unavailable')
    expect(calendarDayAccess({ key: '2026-09-29' }, 'free', now)).toBe('premium')
    expect(calendarDayAccess({ key: '2026-10-29' }, 'premium', now)).toBe('premium')
    expect(calendarDayAccess({ key: '2026-12-27' }, { planId: 'premium', billingCycle: 'yearly' }, now)).toBe('available')
    expect(calendarDayAccess({ key: 'invalid' }, 'free', now)).toBe('unavailable')
  })
  it('unlocks calendar only for a local development mock, without changing the actual plan', () => {
    const local = { development: true, hostname: 'localhost', status: 'local' }
    const plan = calendarPlanForSession('free', local)
    expect(plan).toEqual({ planId: 'premium', billingCycle: 'yearly', localPreview: true })
    expect(canAccessCalendarDay({ key: '2026-12-27' }, plan, new Date('2026-09-28T05:00:00Z'))).toBe(true)
    expect(calendarMonthAccess(2026, 10, plan, new Date(2026, 8, 28))).toBe('available')
    expect(calendarMonthAccess(2026, 11, plan, new Date(2026, 8, 28))).toBe('available')
    expect(calendarPlanForSession('free', { ...local, development: false })).toBe('free')
    expect(calendarPlanForSession('free', { ...local, hostname: 'bz-bazi.netlify.app' })).toBe('free')
    expect(calendarPlanForSession('free', { ...local, status: 'authenticated' })).toBe('free')
    expect(comparisonLimitForPlan('free')).toBe(1)
  })
  it('opens every luck cycle for free, including future cycles without a current cycle', () => {
    const current = { index: 3 }
    expect(canAccessLuckCycle({ index: 1 }, current, 'free')).toBe(true)
    expect(canAccessLuckCycle({ index: 3 }, current, 'free')).toBe(true)
    expect(canAccessLuckCycle({ index: 4 }, current, 'free')).toBe(true)
    expect(canAccessLuckCycle({ index: 9 }, null, 'free')).toBe(true)
    expect(canAccessLuckCycle(null)).toBe(false)
    expect(canAccessLuckCycle({ index: 4 }, current, 'premium')).toBe(true)
  })

  it('keeps only today free in the daily calendar', () => {
    const now = new Date('2026-09-28T05:00:00Z')
    expect(canAccessCalendarDay({ key: '2026-09-28' }, 'free', now)).toBe(true)
    expect(canAccessCalendarDay({ key: '2026-09-29', isToday: true }, 'free', now)).toBe(false)
    expect(canAccessCalendarDay({ key: '2026-09-27' }, 'premium', now)).toBe(false)
  })

  it('gates months intersecting the rolling entitlement window', () => {
    const now = new Date(2026, 8, 24)
    expect(calendarMonthAccess(2026, 9, 'free', now)).toBe('available')
    expect(calendarMonthAccess(2026, 10, 'free', now)).toBe('premium')
    expect(calendarMonthAccess(2026, 10, 'premium', now)).toBe('available')
    expect(calendarMonthAccess(2026, 11, 'premium', now)).toBe('premium')
    expect(calendarMonthAccess(2026, 8, 'premium', now)).toBe('unavailable')
  })

  it('includes exactly today plus 30 or 90 days, across month and year boundaries', () => {
    const now = new Date('2026-09-28T05:00:00Z')
    const monthly = { planId: 'premium', billingCycle: 'monthly' }
    const yearly = { planId: 'premium', billingCycle: 'yearly' }
    expect(canAccessCalendarDay({ key: '2026-10-28' }, monthly, now)).toBe(true)
    expect(canAccessCalendarDay({ key: '2026-10-29' }, monthly, now)).toBe(false)
    expect(canAccessCalendarDay({ key: '2026-12-27' }, yearly, now)).toBe(true)
    expect(canAccessCalendarDay({ key: '2026-12-28' }, yearly, now)).toBe(false)
    expect(canAccessCalendarDay({ key: '2027-01-30' }, monthly, new Date('2026-12-31T05:00:00Z'))).toBe(true)
    expect(canAccessCalendarDay({ key: '2028-03-01' }, monthly, new Date('2028-01-31T05:00:00Z'))).toBe(true)
  })

  it('uses Bangkok midnight and removes future access at the exact expiry', () => {
    const member = { planId: 'premium', billingCycle: 'yearly', premiumExpiresAt: '2026-09-28T17:00:00Z' }
    const now = new Date(member.premiumExpiresAt)
    expect(canAccessCalendarDay({ key: '2026-09-29' }, member, now)).toBe(true)
    expect(canAccessCalendarDay({ key: '2026-09-30' }, member, now)).toBe(false)
    expect(canAccessCalendarDay({ key: '2026-09-28', isToday: true }, member, now)).toBe(false)
    expect(canAccessCalendarDay({ key: '2026-02-30' }, member, now)).toBe(false)
  })

  it('uses the agreed comparison quotas', () => {
    expect(comparisonLimitForPlan('premium', 'yearly')).toBe(10)
    expect(comparisonLimitForPlan('free', 'yearly')).toBe(1)
    expect(comparisonBalance({ planId: 'premium', billingCycle: 'yearly', includedUsed: 5, purchasedCredits: 5 })).toEqual({ includedLimit: 10, includedRemaining: 5, purchasedRemaining: 5, totalRemaining: 10 })
    expect(comparisonLimitForPlan('free')).toBe(1)
    expect(comparisonLimitForPlan('premium')).toBe(5)
    expect(comparisonBalance({ planId: 'premium', includedUsed: 2, purchasedCredits: 5 })).toEqual({
      includedLimit: 5, includedRemaining: 3, purchasedRemaining: 5, totalRemaining: 8
    })
  })

  it('consumes monthly premium quota before non-expiring purchased credits', () => {
    expect(consumeComparison({ planId: 'premium', billingCycle: 'yearly', includedUsed: 9, purchasedCredits: 5 })).toEqual({ source: 'included', includedUsed: 10, purchasedCredits: 5 })
    expect(consumeComparison({ planId: 'premium', billingCycle: 'yearly', includedUsed: 10, purchasedCredits: 5 })).toEqual({ source: 'purchased', includedUsed: 10, purchasedCredits: 4 })
    expect(consumeComparison({ planId: 'premium', billingCycle: 'yearly', includedUsed: 10 })).toBeNull()
    expect(consumeComparison({ planId: 'premium', includedUsed: 4, purchasedCredits: 5 })).toEqual({
      source: 'included', includedUsed: 5, purchasedCredits: 5
    })
    expect(consumeComparison({ planId: 'premium', includedUsed: 5, purchasedCredits: 5 })).toEqual({
      source: 'purchased', includedUsed: 5, purchasedCredits: 4
    })
    expect(consumeComparison({ planId: 'free', includedUsed: 1, purchasedCredits: 0 })).toBeNull()
  })
})
