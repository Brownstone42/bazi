import { describe, expect, it } from 'vitest'
import { buildQuestionReading, findQuestionDates, questionTopics } from './bazi-questions.js'
import { calculateChart } from './bazi.js'
import { calculateTenGod } from '@openfate/bazi-engine'
const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
describe('isolated question prototype', () => {
  it('uses all ten gods relative to the owner rather than transit chart day master', () => {
    const reading = buildQuestionReading({ input, date: '2026-10-12' })
    expect(reading.contexts.map(item => item.key)).toEqual(['luck', 'year', 'month', 'day'])
    for (const layer of reading.contexts) expect(layer.god).toBe(calculateTenGod(reading.natal.dayMaster, layer.ganZhi[0]))
    expect(reading.evidence.some(item => item.kind === 'hidden')).toBe(true)
    expect(reading.evidence.some(item => item.kind === 'roots')).toBe(true)
    expect(new Set(reading.evidence.map(item => item.id)).size).toBe(reading.evidence.length)
  })
  it('calculates event pillars in Bangkok independently of the birth timezone', () => {
    const reading = buildQuestionReading({ input: { ...input, timezoneId: 'America/New_York' }, date: '2026-10-12' })
    const event = calculateChart({ ...input, birthDate: '2026-10-12', birthTime: '12:00' })
    expect(reading.contexts.find(item => item.key === 'day').ganZhi).toBe(event.pillars.day.ganZhi)
  })
  it('does not mutate birth inputs, and is deterministic for the same question', () => {
    const args = { input: Object.freeze({ ...input }), date: '2026-10-12', topic: 'negotiation' }
    expect(buildQuestionReading(args)).toEqual(buildQuestionReading(args))
  })
  it('changes action by day and question without changing underlying pillars for the same date', () => {
    const a = buildQuestionReading({ input, date: '2026-10-12', topic: 'presentation' })
    const b = buildQuestionReading({ input, date: '2026-10-12', topic: 'deadline' })
    expect(a.contexts).toEqual(b.contexts)
    expect(a.action).not.toBe(b.action)
    expect(a.action).not.toBe(buildQuestionReading({ input, date: '2026-10-13', topic: 'presentation' }).action)
  })
  it('has distinct activity rules rather than an all-purpose good day score', () => {
    expect(questionTopics).toHaveLength(5)
    expect(new Set(questionTopics.map(item => item.gods.join(','))).size).toBe(5)
  })
  it.each(['2026-02-30', '2026-13-01', '', '01/10/2026', '1800-01-01'])('rejects invalid dates %s', date => {
    expect(() => buildQuestionReading({ input, date })).toThrow()
  })
  it('requires time and specified gender', () => {
    expect(() => buildQuestionReading({ input: { ...input, birthTime: '' }, date: '2026-10-12' })).toThrow()
    expect(() => buildQuestionReading({ input: { ...input, gender: 'unspecified' }, date: '2026-10-12' })).toThrow()
    expect(() => buildQuestionReading({ input, date: '2026-10-12', topic: 'unknown' })).toThrow()
  })
  it('limits and ranks the inclusive date interval without success probabilities', () => {
    const dates = findQuestionDates({ input, start: '2026-10-12', end: '2026-10-15', topic: 'learning' })
    expect(dates).toHaveLength(3)
    expect(dates.every(item => item.date >= '2026-10-12' && item.date <= '2026-10-15')).toBe(true)
    expect(dates[0].relevanceCount).toBeGreaterThanOrEqual(dates[1].relevanceCount)
    expect(dates[0].limits.join(' ')).toContain('ยังไม่ผ่านการตรวจโดยผู้เชี่ยวชาญ')
    expect(dates[0]).not.toHaveProperty('successProbability')
    expect(() => findQuestionDates({ input, start: '2026-10-12', end: '2026-10-11', topic: 'learning' })).toThrow()
    expect(() => findQuestionDates({ input, start: '2026-10-01', end: '2026-11-01', topic: 'learning' })).toThrow()
  })
})
