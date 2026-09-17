import { describe, expect, it } from 'vitest'
import { calculateChart } from './bazi'
import { interpretCompatibility } from './compatibility'

const first = calculateChart({
  birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok'
})
const second = calculateChart({
  birthDate: '04/02/1990', birthTime: '12:00', gender: 'female', timezoneId: 'Asia/Bangkok'
})

describe('compatibility reading', () => {
  it('creates one focused reading for the selected relationship and topic', () => {
    const result = interpretCompatibility(first, second, {
      relationship: 'partner', focus: 'work', hasBirthTime: true
    })

    expect(result.focusLabel).toBe('การทำงานและธุรกิจ')
    expect(result.summary).toContain('สำหรับความสัมพันธ์แบบแฟน')
    expect(result.timeWarning).toBeNull()
  })

  it('clearly limits the reading when the second birth time is unknown', () => {
    const result = interpretCompatibility(first, second, {
      relationship: 'friend', focus: 'friendship', hasBirthTime: false
    })

    expect(result.timeWarning).toContain('ไม่ทราบเวลาเกิดของอีกฝ่าย')
    expect(result.confidence).toBe('อ่านจากข้อมูลที่ทราบ')
  })
})
