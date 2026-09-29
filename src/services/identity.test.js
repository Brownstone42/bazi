import { describe, expect, it } from 'vitest'
import { calculateChart } from './bazi'
import { assessDayMasterStrength } from './strength-engine'
import { buildIdentity } from './identity'
const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
describe('identity reading', () => {
  it('produces finite, complete distributions for different charts', () => {
    for (const birthDate of ['26/08/1989', '04/02/1990', '15/12/2000', '10/05/1975']) {
      const chart = calculateChart({ ...input, birthDate })
      const result = buildIdentity(chart, assessDayMasterStrength(chart))
      for (const distribution of [result.talents, result.groups, result.elements]) {
        expect(distribution.reduce((sum, item) => sum + item.share, 0)).toBe(100)
        expect(distribution.every(item => Number.isFinite(item.share) && item.share >= 0)).toBe(true)
      }
      expect(result.talents).toHaveLength(10)
      expect(result.top.every(item => item.weight > 0 && item.profile.roles.length > 0)).toBe(true)
    }
  })
  it('does not turn the day master itself into an extra Friend talent', () => {
    const chart = calculateChart(input)
    const isolated = { ...chart, pillars: { day: { ...chart.pillars.day, hiddenStems: [{ stem: '丁', element: 'fire' }] } } }
    const result = buildIdentity(isolated, assessDayMasterStrength(chart))
    expect(result.talents.find(item => item.god === '比肩').weight).toBe(0)
  })
  it('changes situational reading with strength while preserving presence shares', () => {
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    const strong = buildIdentity(chart, { ...assessment, strengthLevel: 'strong' })
    const weak = buildIdentity(chart, { ...assessment, strengthLevel: 'weak' })
    expect(strong.nuance).not.toBe(weak.nuance)
    expect(strong.pressure).not.toBe(weak.pressure)
    expect(strong.elements).toEqual(weak.elements)
  })
})
