import { describe, expect, it } from 'vitest'
import { buildDailyBalance } from './daily-balance'

const assessment = { patternType: 'regular', primaryUsefulElement: 'metal', supportiveElements: ['water', 'wood'], cautionElements: ['fire', 'earth'] }
const args = { assessment, dayElements: ['fire', 'earth'], personalScore: 30 }

describe('daily balance suggestions', () => {
  it('uses favorable elements, not missing elements, without changing its inputs', () => {
    const before = structuredClone(args)
    const result = buildDailyBalance(args)
    expect(result.options.map(option => option.element)).toEqual(['water'])
    expect(result.options[0].color).toBe('ดำ')
    expect(result.target).toBe('fire')
    expect(result.options[0].method).toBe('control')
    expect(result.reduce).toContain('แดงและสีเหลือง')
    expect(args).toEqual(before)
  })
  it('does not prescribe colors for good days or non-element conflicts', () => {
    expect(buildDailyBalance({ ...args, personalScore: 50 })).toBeNull()
    expect(buildDailyBalance({ ...args, dayElements: ['water', 'wood'] })).toBeNull()
  })
  it('does not guess when assessment is special or unresolved', () => {
    expect(buildDailyBalance({ ...args, assessment: { ...assessment, patternType: 'possible_follow' } })).toBeNull()
    expect(buildDailyBalance({ ...args, assessment: { cautionElements: ['fire'] } })).toBeNull()
  })
  it('falls back to support but never recommends caution elements', () => {
    expect(buildDailyBalance({ ...args, assessment: { ...assessment, primaryUsefulElement: 'fire' } }).options[0].element).toBe('water')
  })
  it('changes with the main negative element, not the date or a random color rotation', () => {
    const earthDay = buildDailyBalance({ ...args, dayElements: ['earth', 'fire'] })
    expect(earthDay.options.map(option => option.element)).toEqual(['metal'])
    expect(earthDay.options[0].method).toBe('drain')
    expect(buildDailyBalance(args).options[0].element).toBe('water')
    expect(buildDailyBalance(args)).toEqual(buildDailyBalance(args))
  })
  it('can use supportive Wood to control Earth when Metal is unavailable', () => {
    const result = buildDailyBalance({ ...args, dayElements: ['earth', 'water'], assessment: { ...assessment, primaryUsefulElement: null, supportiveElements: ['wood'] } })
    expect(result.options[0].element).toBe('wood')
    expect(result.options[0].color).toBe('เขียว')
  })
  it('offers both Metal and Wood for Earth without ranking or duplicate choices', () => {
    const result = buildDailyBalance({ ...args, dayElements: ['earth', 'water'], assessment: { ...assessment, supportiveElement: 'wood' } })
    expect(result.options.map(option => option.element)).toEqual(['metal', 'wood'])
    expect(result.options.map(option => option.method)).toEqual(['drain', 'control'])
    expect(result.suggestion).toContain('ไม่จำเป็นต้องใช้ทุกสี')
  })
  it('omits advice if the candidate feeds another negative element or cannot address the main one', () => {
    const woodOnly = { ...assessment, primaryUsefulElement: null, supportiveElements: ['wood'] }
    expect(buildDailyBalance({ ...args, dayElements: ['earth', 'fire'], assessment: woodOnly })).toBeNull()
    expect(buildDailyBalance({ ...args, assessment: { ...assessment, supportiveElements: [] } })).toBeNull()
  })
})
