import { describe, expect, it } from 'vitest'
import { branchThaiLabel, calculateChart, calculateChartWithOptionalTime, pillarLabel, stemThai } from './bazi'

describe('BaZi calculation', () => {
  it('calculates four pillars from civil time in the selected timezone', () => {
    const chart = calculateChart({
      birthDate: '04/02/1990',
      birthTime: '12:00',
      gender: 'male',
      timezoneId: 'Asia/Bangkok',
    })

    expect(pillarLabel(chart.pillars.year)).toBe('庚午')
    expect(pillarLabel(chart.pillars.month)).toBe('戊寅')
    expect(pillarLabel(chart.pillars.day)).toBe('庚子')
    expect(pillarLabel(chart.pillars.hour)).toBe('壬午')
    expect(chart.solarTimeInfo).toBeNull()
    expect(stemThai(chart.pillars.hour)).toBe('น้ำ หยาง')
    expect(branchThaiLabel(chart.pillars.hour)).toBe('มะเมีย · ไฟ หยาง')
    expect(chart.daYun.cycles).toHaveLength(9)
    expect(typeof chart.daYun.isForward).toBe('boolean')
    expect(chart.daYun.startDate).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('rejects an impossible day/month/year date', () => {
    expect(() => calculateChart({
      birthDate: '31/02/1990',
      birthTime: '12:00',
      gender: 'male',
      timezoneId: 'Asia/Bangkok'
    })).toThrow('วันเกิดไม่ถูกต้อง')
  })

  it('supports an unknown birth time without claiming that the time is known', () => {
    const result = calculateChartWithOptionalTime({
      birthDate: '04/02/1990',
      birthTime: '',
      gender: 'female',
      timezoneId: 'Asia/Bangkok'
    })

    expect(result.hasBirthTime).toBe(false)
    expect(result.chart.pillars.day).toBeTruthy()
  })
})
