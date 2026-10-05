import { calculateChart, branchThaiLabel } from './bazi'

export const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

export function birthDateDescription(value, time = '12:00', timezoneId = 'Asia/Bangkok') {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '')
  if (!match) return null
  const [, d, m, y] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  // Date preview only; this sample time never becomes stored birth time or a personal reading.
  const pillar = calculateChart({ birthDate: value, birthTime: validTime ? time : '12:00', gender: 'male', timezoneId }).pillars.year
  return {
    label: `${d} ${thaiMonths[m - 1]} ${y + 543}`,
    weekday: new Intl.DateTimeFormat('th-TH', { weekday: 'long', timeZone: 'UTC' }).format(date),
    animal: branchThaiLabel(pillar).split(' · ')[0],
    hasBirthTime: validTime,
  }
}
