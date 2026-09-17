export function timeStringToPickerDate(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  return new Date(2000, 0, 1, hour, minute)
}

export function pickerDateToTimeString(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return ''
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}
