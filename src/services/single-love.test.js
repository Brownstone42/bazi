import { describe, expect, it } from 'vitest'
import { calculateTenGod } from '@openfate/bazi-engine'
import { buildSingleLoveReadings, peachBranch } from './single-love.js'
const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
const read = date => buildSingleLoveReadings({ input, date })

describe('single love daily rules', () => {
  it.each([['申', '酉'], ['子', '酉'], ['辰', '酉'], ['寅', '卯'], ['午', '卯'], ['戌', '卯'], ['巳', '午'], ['酉', '午'], ['丑', '午'], ['亥', '子'], ['卯', '子'], ['未', '子']])('looks up peach blossom %s → %s', (branch, expected) => {
    expect(peachBranch(branch)).toBe(expected)
  })
  it('rejects incomplete lookup references', () => {
    expect(peachBranch('')).toBe(null)
    expect(peachBranch('申子')).toBe(null)
  })
  it('shares facts while producing five different lenses with traceable evidence', () => {
    const result = read('2026-10-25')
    expect(result.readings).toHaveLength(5)
    expect(new Set(result.readings.map(item => item.headline)).size).toBe(5)
    for (const reading of result.readings) {
      expect(reading.contexts).toBe(result.readings[0].contexts)
      const evidenceIds = reading.evidence.map(item => item.id)
      expect(new Set(evidenceIds).size).toBe(evidenceIds.length)
      for (const id of [...reading.supportingSignalIds, ...reading.counterSignalIds]) expect(evidenceIds).toContain(id)
      for (const context of reading.contexts) expect(context.god).toBe(calculateTenGod(reading.natal.dayMaster, context.stem))
      expect(reading).not.toHaveProperty('successProbability')
    }
    expect(result.readings[4].status).toBe('uncertain')
    expect(result.readings[1].headline).not.toBe(result.readings[4].headline)
  })
  it('is deterministic and changes facts and advice with actual dates', () => {
    const a = read('2026-10-25')
    expect(a).toEqual(read('2026-10-25'))
    const b = read('2026-10-26')
    expect(a.signals).not.toEqual(b.signals)
    expect(a.readings[2].headline).not.toBe(b.readings[2].headline)
    const repeat = read('2026-12-24')
    expect(a.readings[0].contexts.find(item => item.key === 'day').ganZhi).toBe(repeat.readings[0].contexts.find(item => item.key === 'day').ganZhi)
    expect(a.readings[0].summary).not.toBe(repeat.readings[0].summary)
  })
  it('keeps contradictory palace and peach signals without doubling a probability', () => {
    // Natal year 巳 → 午 and natal day 午 → 卯; 卯 also breaks 午.
    const samples = Array.from({ length: 12 }, (_, i) => read(`2026-10-${String(i + 1).padStart(2, '0')}`))
    const peachDays = samples.filter(result => result.signals.some(signal => signal.layerKey === 'day' && signal.kind === 'peach'))
    expect(peachDays.length).toBeGreaterThan(0)
    const cautionDays = samples.filter(result => result.readings[4].counterSignalIds.length)
    expect(cautionDays.length).toBeGreaterThan(0)
    const mixed = samples.find(result => result.date === '2026-10-08')
    expect(mixed.readings[0].status).toBe('mixed')
    expect(mixed.readings[4].supportingSignalIds).toContain('day-peach-day')
    expect(mixed.readings[4].counterSignalIds).toContain('day-day-DESTRUCTION')
    for (const result of samples) {
      const daily = result.signals.filter(signal => signal.layerKey === 'day')
      if (daily.some(signal => signal.kind === 'peach') && daily.some(signal => signal.kind === 'palace' && ['CLASH', 'HARM', 'PUNISHMENT', 'DESTRUCTION'].includes(signal.interactionType))) {
        expect(result.readings[0].status).toBe('mixed')
        expect(result.readings[4].summary).toContain('ไม่ควรตีความดาวเสน่ห์ด้านเดียว')
      }
      expect(result.readings[4].status).toBe('uncertain')
    }
  })
  it('validates incomplete birth information and impossible dates', () => {
    expect(() => buildSingleLoveReadings({ input: { ...input, birthTime: '' }, date: '2026-10-25' })).toThrow()
    expect(() => buildSingleLoveReadings({ input: { ...input, gender: 'unspecified' }, date: '2026-10-25' })).toThrow()
    expect(() => read('2026-02-30')).toThrow()
  })
  it('uses structure in all five answers, with shared natal facts and date-specific transit reasons', () => {
    const result = read('2026-10-25')
    for (const reading of result.readings) {
      expect(reading.structure).toBe(result.structure)
      expect(reading.summary).toContain(result.structure.label)
      expect(reading.summary).toContain(result.structure.resolution.summary)
      expect(reading.supportingSignalIds).toContain('day-structure')
      expect(reading.structureContext.map(item => item.layerKey)).toEqual(['luck', 'year', 'month'])
    }
    const next = read('2026-10-26')
    expect(next.structure).toEqual(result.structure)
    expect(next.readings[0].structureDay.text).not.toBe(result.readings[0].structureDay.text)
  })
})
