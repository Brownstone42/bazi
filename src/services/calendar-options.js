export const calendarFocusOptions = [
  { label: 'ภาพรวมทุกเรื่อง', value: 'all', icon: 'pi-sparkles' },
  { label: 'การงาน', value: 'work', icon: 'pi-briefcase' },
  { label: 'การเงิน', value: 'money', icon: 'pi-wallet' },
  { label: 'ความรัก', value: 'love', icon: 'pi-heart' },
  { label: 'การเจรจา', value: 'communication', icon: 'pi-comments' },
  { label: 'การพักและดูแลตัวเอง', value: 'wellbeing', icon: 'pi-sun' }
]

export function shiftCalendarMonth(year, month, amount) {
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}
