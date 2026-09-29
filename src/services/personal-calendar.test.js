import { describe, expect, it } from 'vitest'
import { calculateChart } from './bazi'
import { assessDayMasterStrength } from './strength-engine'
import { buildLuckPillarTimeline } from './luck-pillars'
import { buildPersonalMonth, shiftCalendarMonth, personalDayScore } from './personal-calendar'

const input = {
  birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok'
}

describe('personal calendar', () => {
  it('maps the full score range to 0–100 with 50 as midpoint', () => {
    expect([-10, -5, -2.5, 0, 2.5, 5, 10].map(personalDayScore)).toEqual([0, 0, 25, 50, 75, 100, 100])
  })
  it('offers both Water and Metal for the reference birth across September and October', () => {
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    const days = [9, 10].flatMap(month => buildPersonalMonth({ chart, assessment, input, year: 2026, month }).days)
    const suggestions = days.filter(day => day.dailyBalance).map(day => day.dailyBalance)
    expect(new Set(suggestions.flatMap(item => item.options.map(option => option.element)))).toEqual(new Set(['water', 'metal', 'wood']))
    for (const item of suggestions) {
      expect(item.options.every(option => (item.target === 'fire' ? ['water'] : ['metal', 'wood']).includes(option.element))).toBe(true)
    }
  })
  it('provides balance suggestions using each selected topic score and the overview score', () => {
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    const month = buildPersonalMonth({ chart, assessment, input, year: 2026, month: 9 })
    const readings = month.days.flatMap(day => [day, ...day.topicReadings])
    expect(readings.some(reading => reading.dailyBalance)).toBe(true)
    for (const reading of readings) {
      const hasNegativeElement = reading.scoreExplanation.factors.some(factor => ['day-element', 'day-base'].includes(factor.id) && factor.points < 0)
      expect(Boolean(reading.dailyBalance)).toBe(reading.personalScore < 50 && hasNegativeElement)
      if (reading.dailyBalance) for (const option of reading.dailyBalance.options) expect(assessment.cautionElements).not.toContain(option.element)
    }
  })
  it('shows Wood dates and scores Wood as controlling support for the strong Earth example', () => {
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    expect(assessment.elementAssessments.wood.status).toBe('supportive')
    for (const monthNumber of [9, 10]) {
      const month = buildPersonalMonth({ chart, assessment, input, year: 2026, month: monthNumber })
      const woodDays = month.days.filter(day => day.scoreExplanation.factors.some(item => item.id === 'day-element' && item.label.includes('(ไม้)')))
      expect(woodDays.map(day => day.day)).toEqual([7, 8, 17, 18, 27, 28])
      expect(woodDays.every(day => day.scoreExplanation.factors.find(item => item.id === 'day-element').points === 10)).toBe(true)
    }
    const neutral = { ...assessment, primaryUsefulElement: null, supportiveElement: null, supportiveElements: [], cautionElements: [], elementAssessments: {} }
    const month = buildPersonalMonth({ chart, assessment: neutral, input, year: 2026, month: 9 })
    expect(month.days.every(day => day.scoreExplanation.factors.some(item => item.id === 'day-element' && item.points === 0))).toBe(true)
  })
  it('reconciles explanations to every displayed score, including averaging and bounds', () => {
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    const month = buildPersonalMonth({ chart, assessment, input, year: 2026, month: 9 })
    const readings = month.days.flatMap(day => [day, ...day.topicReadings])
    for (const reading of readings) {
      const explanation = reading.scoreExplanation
      expect(explanation.base + explanation.factors.reduce((sum, item) => sum + item.points, 0) + explanation.adjustment).toBeCloseTo(reading.personalScore, 8)
      expect(new Set(explanation.factors.map(item => item.id)).size).toBe(explanation.factors.length)
      expect(explanation.summary).toBeTruthy()
      expect(explanation.factors.some(item => /star/.test(item.id))).toBe(false)
    }
    expect(readings.some(reading => reading.scoreExplanation.factors.some(item => item.points < 0 && !item.technical))).toBe(true)
    expect(readings.some(reading => reading.scoreExplanation.factors.some(item => item.points > 0 && !item.technical))).toBe(true)
    // Synthetic repeated branches force the lower bound; ordinary months need not hit it.
    const stressedChart = structuredClone(chart)
    Object.values(stressedChart.pillars).forEach(pillar => { pillar.branch = '子' })
    const stressed = buildPersonalMonth({ chart: stressedChart, assessment, input, year: 2026, month: 9, focus: 'wellbeing' })
    const bounded = stressed.days.find(day => day.scoreExplanation.factors.some(item => item.technical))
    expect(bounded).toBeTruthy()
    expect(50 + bounded.scoreExplanation.factors.reduce((sum, item) => sum + item.points, 0) + bounded.scoreExplanation.adjustment).toBeCloseTo(bounded.personalScore, 8)
  })
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
    expect(month.days.some((day) => day.summary.includes('ไม่เป็นไปตามแผน'))).toBe(true)
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
    expect(month.days.every((day) => !day.summary.includes('ไม่รีบเอาข้อสรุป'))).toBe(true)
    expect(month.days.every((day) => !day.dailyAdvice.includes('เรื่องหนึ่งไปตัดสินอีกเรื่องหนึ่ง'))).toBe(true)
    expect(month.days.every((day) => day.summary.includes('วันนี้'))).toBe(true)
    expect(month.days.every((day) => day.summary.length < 240)).toBe(true)
    expect(month.days.every((day) => day.dailyAdvice.length < 350)).toBe(true)
  })

  it('moves across year boundaries', () => {
    expect(shiftCalendarMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftCalendarMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })
})
