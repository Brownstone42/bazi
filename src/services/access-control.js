export const accessPlans = {
  free: {
    id: 'free', label: 'Free', comparisonLimit: 1,
    description: 'พื้นดวง ถนนสิบปีถึงปัจจุบัน ภาพรวมวันนี้ และเปรียบเทียบบุคคล 1 คน'
  },
  premium: {
    id: 'premium', label: 'Premium', comparisonLimit: 5,
    monthlyPrice: 299, yearlyPrice: 2490,
    description: 'เปิดเครื่องมือวางแผนล่วงหน้าและเปรียบเทียบบุคคล 5 คนต่อเดือน'
  },
  comparison: {
    id: 'comparison', label: 'สิทธิ์เปรียบเทียบบุคคล', purchasedCredits: 5,
    price: 100,
    description: 'เปรียบเทียบบุคคลได้ 5 คนและเก็บสิทธิ์ไว้ใช้ได้โดยไม่หมดอายุ'
  }
}

export function comparisonLimitForPlan(planId) {
  return planId === 'premium' ? accessPlans.premium.comparisonLimit : accessPlans.free.comparisonLimit
}

export function comparisonBalance({ planId, includedUsed = 0, purchasedCredits = 0 }) {
  const includedLimit = comparisonLimitForPlan(planId)
  const includedRemaining = Math.max(0, includedLimit - includedUsed)
  return {
    includedLimit,
    includedRemaining,
    purchasedRemaining: Math.max(0, purchasedCredits),
    totalRemaining: includedRemaining + Math.max(0, purchasedCredits)
  }
}

export function consumeComparison({ planId, includedUsed = 0, purchasedCredits = 0 }) {
  const balance = comparisonBalance({ planId, includedUsed, purchasedCredits })
  if (balance.includedRemaining > 0) {
    return { source: 'included', includedUsed: includedUsed + 1, purchasedCredits }
  }
  if (balance.purchasedRemaining > 0) {
    return { source: 'purchased', includedUsed, purchasedCredits: purchasedCredits - 1 }
  }
  return null
}

export function canAccessLuckCycle(cycle, currentCycle, planId) {
  if (planId === 'premium') return true
  if (!cycle || !currentCycle) return false
  return cycle.index <= currentCycle.index
}

export function canAccessCalendarDay(day, planId) {
  return planId === 'premium' || Boolean(day?.isToday)
}

export function calendarMonthAccess(year, month, planId, now = new Date()) {
  const currentIndex = now.getFullYear() * 12 + now.getMonth()
  const requestedIndex = year * 12 + month - 1
  if (requestedIndex === currentIndex) return 'available'
  if (planId === 'premium' && requestedIndex === currentIndex + 1) return 'available'
  return requestedIndex === currentIndex + 1 ? 'premium' : 'unavailable'
}
