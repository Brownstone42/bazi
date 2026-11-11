import { describe, it, expect } from 'vitest'
import { calculateChart } from './bazi.js'
import { assessDayMasterStrength } from './strength-engine.js'
import { buildPersonalHours } from './personal-calendar.js'
describe('experimental hourly scoring', () => {
  it('covers a civil day without gaps and reconciles every score', () => {
    const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
    const chart = calculateChart(input)
    const before = JSON.stringify(chart)
    const assessment = assessDayMasterStrength(chart)
    const hours = buildPersonalHours({ chart, assessment, input, date: '2026-11-02' })
    expect(hours).toHaveLength(13)
    expect(hours[0].start).toBe(0)
    expect(hours.at(-1).end).toBe(24)
    expect(new Set(hours.map(hour => hour.score)).size).toBeGreaterThan(1)
    hours.forEach((hour, index) => {
      if (index) expect(hour.start).toBe(hours[index - 1].end)
      expect(hour.score).toBeGreaterThanOrEqual(0)
      expect(hour.score).toBeLessThanOrEqual(100)
      expect(50 + hour.factors.reduce((sum, item) => sum + item.points, 0) + hour.adjustment).toBeCloseTo(hour.score)
      expect(hour.factors.every(item => item.points !== 0)).toBe(true)
    })
    const late = calculateChart({ ...input, birthDate: '02/11/2026', birthTime: '23:30' }).pillars.hour
    expect(hours.at(-1).pillar).toBe(`${late.stem}${late.branch}`)
    expect(JSON.stringify(chart)).toBe(before)
  })
  it('does not infer an incomplete natal profile', () => {
    expect(buildPersonalHours({ chart: null })).toEqual([])
  })
})
