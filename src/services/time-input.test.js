import { describe, expect, it } from 'vitest'
import { pickerDateToTimeString, timeStringToPickerDate } from './time-input'

describe('24-hour time picker bridge', () => {
  it('preserves the hour and minute without AM/PM conversion', () => {
    expect(pickerDateToTimeString(timeStringToPickerDate('00:05'))).toBe('00:05')
    expect(pickerDateToTimeString(timeStringToPickerDate('11:30'))).toBe('11:30')
    expect(pickerDateToTimeString(timeStringToPickerDate('23:30'))).toBe('23:30')
  })

  it('keeps an unknown time empty', () => {
    expect(timeStringToPickerDate('')).toBeNull()
    expect(pickerDateToTimeString(null)).toBe('')
  })
})
