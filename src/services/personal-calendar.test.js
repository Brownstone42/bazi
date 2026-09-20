import { describe, expect, it } from 'vitest'
import { calculateChart } from './bazi'
import { assessDayMasterStrength } from './strength-engine'
import { buildLuckPillarTimeline } from './luck-pillars'
import { buildPersonalMonth, shiftCalendarMonth } from './personal-calendar'

const input = {
  birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok'
}

describe('personal calendar', () => {
  it('builds a complete month with personalized daily guidance', () => {
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    const timeline = buildLuckPillarTimeline(chart, input.gender, input.timezoneId, new Date('2026-09-20T00:00:00Z'))
    const month = buildPersonalMonth({
      chart, assessment, input, year: 2026, month: 9, focus: 'work',
      currentLuckCycle: timeline.cycles.find((cycle) => cycle.isCurrent),
      now: new Date('2026-09-20T00:00:00Z')
    })

    expect(month.days).toHaveLength(30)
    expect(month.days.find((day) => day.isToday)?.day).toBe(20)
    expect(month.recommended).toHaveLength(3)
    expect(month.caution).toHaveLength(2)
    expect(month.days.every((day) => day.dailyAdvice)).toBe(true)
    expect(new Set(month.days.map((day) => day.dailyAdvice)).size).toBeGreaterThanOrEqual(5)
    expect(new Set(month.days.map((day) => day.level)).size).toBeGreaterThan(1)
    expect(month.days.some((day) => day.summary.includes('แรงเสียดทาน'))).toBe(true)
  })

  it('changes the advice when the user changes focus', () => {
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    const work = buildPersonalMonth({ chart, assessment, input, year: 2026, month: 9, focus: 'work' })
    const love = buildPersonalMonth({ chart, assessment, input, year: 2026, month: 9, focus: 'love' })

    expect(work.days[0].dailyAdvice).not.toBe(love.days[0].dailyAdvice)
    expect(work.days.map((day) => day.score)).not.toEqual(love.days.map((day) => day.score))
  })

  it('uses an all-topics overview by default and keeps each topic visible', () => {
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    const month = buildPersonalMonth({ chart, assessment, input, year: 2026, month: 9 })

    expect(month.focus).toBe('all')
    expect(month.focusLabel).toBe('ภาพรวมทุกเรื่อง')
    expect(month.days.every((day) => day.topicReadings?.length === 5)).toBe(true)
    expect(month.days[0].topicReadings.map((topic) => topic.focus)).toEqual([
      'work', 'money', 'love', 'communication', 'wellbeing'
    ])
  })

  it('moves across year boundaries', () => {
    expect(shiftCalendarMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftCalendarMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })
})
