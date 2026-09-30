import { calculateChart } from '../../src/services/bazi.js'
import { assessDayMasterStrength } from '../../src/services/strength-engine.js'
import { buildLuckPillarTimeline } from '../../src/services/luck-pillars.js'
import { buildPersonalMonth } from '../../src/services/personal-calendar.js'
import { calendarDayAccess, calendarMonthAccess, calendarHorizon } from '../../src/services/access-control.js'
import { calendarFocusOptions } from '../../src/services/calendar-options.js'

export function validateCalendarRequest(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(key => !['idToken', 'year', 'month', 'focus'].includes(key))
    || !Number.isInteger(body.year) || body.year < 1900 || body.year > 2200
    || !Number.isInteger(body.month) || body.month < 1 || body.month > 12
    || !calendarFocusOptions.some(item => item.value === body.focus)) throw new Error('calendar_invalid_request')
  return { year: body.year, month: body.month, focus: body.focus }
}

export function buildAuthorizedCalendar({ profile, entitlement, request, now = new Date() }) {
  // Fail closed for absent/invalid expiry, cycle or entitlement; no client preview flags.
  const validPremium = entitlement?.plan_id === 'premium' && ['monthly', 'yearly'].includes(entitlement.billing_cycle)
    && new Date(entitlement.premium_expires_at) > now
  const plan = validPremium
    ? { planId: 'premium', billingCycle: entitlement.billing_cycle, premiumExpiresAt: entitlement.premium_expires_at }
    : { planId: 'free', billingCycle: 'monthly', premiumExpiresAt: null }
  if (calendarMonthAccess(request.year, request.month, plan, now) === 'unavailable') throw new Error('calendar_out_of_range')
  const input = { birthDate: profile.birth_date, birthTime: String(profile.birth_time).slice(0, 5), gender: profile.gender, timezoneId: profile.timezone_id }
  const chart = calculateChart(input)
  const assessment = assessDayMasterStrength(chart)
  const timeline = buildLuckPillarTimeline(chart, input.gender, input.timezoneId, now)
  const month = buildPersonalMonth({ ...request, chart, assessment, input, now, currentLuckCycle: timeline?.cycles.find(cycle => cycle.isCurrent) ?? null,
    dayAccess: day => calendarDayAccess(day, plan, now), displayTimezoneId: 'Asia/Bangkok' })
  // Do not return rankings, counts, or hidden-date aggregates.
  return { month: { year: month.year, month: month.month, monthLabel: month.monthLabel, focus: month.focus, focusLabel: month.focusLabel, leadingBlanks: month.leadingBlanks, days: month.days },
    plan, daysAhead: calendarHorizon(plan, now), serverNow: now.toISOString(), profileVersion: profile.profile_version ?? null }
}
