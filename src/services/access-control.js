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
    id: 'comparison', label: 'เปรียบเทียบบุคคล', comparisonLimit: 5,
    monthlyPrice: 100,
    description: 'ใช้เฉพาะการเปรียบเทียบบุคคล 5 คนภายในเดือนที่ซื้อ'
  }
}

export function comparisonLimitForPlan(planId) {
  return accessPlans[planId]?.comparisonLimit ?? accessPlans.free.comparisonLimit
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
