export const accessPlans = {
  free: {
    id: 'free', label: 'Free', comparisonLimit: 1,
    description: 'พื้นดวง ถนนชีวิต 10 ปีทุกช่วง ภาพรวมวันนี้ และเปรียบเทียบบุคคล 1 คน'
  },
  premium: {
    id: 'premium', label: 'Premium', comparisonLimit: 5, yearlyComparisonLimit: 10,
    monthlyPrice: 149, yearlyPrice: 999,
    description: 'เปิดเครื่องมือวางแผนล่วงหน้า รายเดือนเปรียบเทียบ 5 คนต่อเดือน รายปี 10 คนต่อเดือน'
  },
  comparison: {
    id: 'comparison', label: 'สิทธิ์เปรียบเทียบบุคคล', purchasedCredits: 5,
    price: 59,
    description: 'เปรียบเทียบบุคคลได้ 5 คนและเก็บสิทธิ์ไว้ใช้ได้โดยไม่หมดอายุ'
  }
}

export function comparisonLimitForPlan(planId, billingCycle = 'monthly') {
  return planId === 'premium' ? billingCycle === 'yearly' ? accessPlans.premium.yearlyComparisonLimit : accessPlans.premium.comparisonLimit : accessPlans.free.comparisonLimit
}

export function comparisonBalance({ planId, billingCycle = 'monthly', includedUsed = 0, purchasedCredits = 0 }) {
  const includedLimit = comparisonLimitForPlan(planId, billingCycle)
  const includedRemaining = Math.max(0, includedLimit - includedUsed)
  return {
    includedLimit,
    includedRemaining,
    purchasedRemaining: Math.max(0, purchasedCredits),
    totalRemaining: includedRemaining + Math.max(0, purchasedCredits)
  }
}

export function consumeComparison({ planId, billingCycle = 'monthly', includedUsed = 0, purchasedCredits = 0 }) {
  const balance = comparisonBalance({ planId, billingCycle, includedUsed, purchasedCredits })
  if (balance.includedRemaining > 0) {
    return { source: 'included', includedUsed: includedUsed + 1, purchasedCredits }
  }
  if (balance.purchasedRemaining > 0) {
    return { source: 'purchased', includedUsed, purchasedCredits: purchasedCredits - 1 }
  }
  return null
}

export function canAccessLuckCycle(cycle) {
  return Boolean(cycle)
}

export function calendarHorizon(plan, now = new Date()) {
  const member = typeof plan === 'string' ? { planId: plan } : (plan ?? {})
  if (member.planId !== 'premium') return 0
  if (member.premiumExpiresAt && !(new Date(member.premiumExpiresAt) > now)) return 0
  return member.billingCycle === 'yearly' ? 90 : 30
}

function todayNumber(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = type => Number(parts.find(part => part.type === type).value)
  return Date.UTC(value('year'), value('month') - 1, value('day')) / 86400000
}

export function canAccessCalendarDay(day, plan, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day?.key ?? '')) return false
  const date = new Date(`${day.key}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day.key) return false
  const offset = date.getTime() / 86400000 - todayNumber(now)
  return offset >= 0 && offset <= calendarHorizon(plan, now)
}

export function calendarDayAccess(day, plan, now = new Date()) {
  if (canAccessCalendarDay(day, plan, now)) return 'available'
  return canAccessCalendarDay(day, { planId: 'premium', billingCycle: 'yearly' }, now) ? 'premium' : 'unavailable'
}

export function calendarPlanForSession(planId, { development = false, hostname = '', status = '' } = {}) {
  const localPreview = development && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname) && status === 'local'
  return localPreview ? { planId: 'premium', billingCycle: 'yearly', localPreview: true } : planId
}

export function calendarMonthAccess(year, month, planId, now = new Date()) {
  const start = Date.UTC(year, month - 1, 1) / 86400000
  const end = Date.UTC(year, month, 0) / 86400000
  const today = todayNumber(now)
  if (end < today || start > today + 90) return 'unavailable'
  return start <= today + calendarHorizon(planId, now) ? 'available' : 'premium'
}
