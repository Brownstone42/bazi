export const BIRTH_EDIT_INTERVAL = 30 * 24 * 60 * 60 * 1000
export function birthProfileChanged(previous, next) {
  return Boolean(previous) && ['birthDate', 'birthTime', 'gender', 'timezoneId'].some(key => previous[key] !== next[key])
}
export function birthEditBlocked(nextEditAt, now = Date.now()) {
  return Boolean(nextEditAt) && now < new Date(nextEditAt).getTime()
}
export function formatBirthEditDate(value) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value))
}
