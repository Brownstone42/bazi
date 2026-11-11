import { it, expect } from 'vitest'
import { calculateChart } from './bazi.js'
import { assessDayMasterStrength } from './strength-engine.js'
import { buildYearPreview, currentSolarYear } from './year-preview.js'
const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
const chart = calculateChart(input)
const assessment = assessDayMasterStrength(chart)
it('uses the solar year in January and after Li Chun', () => {
  expect(currentSolarYear('2027-01-15', input)).toBe(2026)
  expect(currentSolarYear('2027-03-01', input)).toBe(2027)
})
it('groups all daily scores into 12 contiguous solar months without inventing topic scores', () => {
  const result = buildYearPreview({ year: 2026, today: '2026-11-02', chart, assessment, input })
  expect(result.months).toHaveLength(12)
  const days = result.months.flatMap(month => month.days)
  expect(days.length).toBeGreaterThanOrEqual(365)
  expect(days.length).toBeLessThanOrEqual(366)
  expect(new Set(days.map(day => day.key)).size).toBe(days.length)
  expect(days.every(day => day.contextPillars.year === result.pillar)).toBe(true)
  expect(result.months.filter(month => month.isCurrent)).toHaveLength(1)
  expect(result.counts.reduce((sum, item) => sum + item.count, 0)).toBe(12)
  for (const topic of result.topics) {
    expect(topic.score).toBe(Math.round(days.reduce((sum, day) => sum + day.topicReadings.find(item => item.focus === topic.focus).personalScore, 0) / days.length))
  }
  expect(result.topics).toHaveLength(5)
  expect(result.yearClash).toBe(false)
  expect(result.zodiac).toEqual({ natal: 'มะเส็ง', friend: 'วอก', clash: 'กุน' })
})
