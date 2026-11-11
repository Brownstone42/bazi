import { describe, expect, it } from 'vitest'
import { calculateChart } from './bazi.js'
import { identity60, identityElements, identityFromChart } from './identity60.js'

describe('original sixty day-pillar identities', () => {
  it('covers the complete cycle once, with twelve identities per element', () => {
    expect(identity60).toHaveLength(60)
    expect(new Set(identity60.map(item => item.id)).size).toBe(60)
    expect(new Set(identity60.map(item => item.title)).size).toBe(60)
    expect(new Set(identity60.map(item => item.subtitle)).size).toBe(60)
    expect(identity60[0].id).toBe('甲子')
    expect(identity60[54].id).toBe('戊午')
    expect(identity60[59].id).toBe('癸亥')
    for (const element of identityElements) expect(identity60.filter(item => item.element === element.key)).toHaveLength(12)
    for (const item of identity60) {
      expect(item.sections).toHaveLength(7)
      expect(item.sections.every(section => section.title && section.text.length > 10)).toBe(true)
      expect(identityFromChart({ pillars: { day: { stem: item.id[0], branch: item.id[1] } } })).toBe(item)
    }
  })
  it('uses the existing calculation, including its 23:00 day boundary', () => {
    const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
    for (const birthTime of ['00:00', '11:30', '22:59', '23:00', '23:59']) {
      const chart = calculateChart({ ...input, birthTime })
      const before = JSON.stringify(chart)
      expect(identityFromChart(chart)?.id).toBe(chart.pillars.day.stem + chart.pillars.day.branch)
      expect(JSON.stringify(chart)).toBe(before)
    }
    const late = calculateChart({ ...input, birthTime: '23:00' })
    const next = calculateChart({ ...input, birthDate: '27/08/1989', birthTime: '00:00' })
    expect(identityFromChart(late).id).toBe(identityFromChart(next).id)
  })
  it('does not guess an identity for missing or invalid chart data', () => {
    expect(identityFromChart(null)).toBeNull()
    expect(identityFromChart({ pillars: { day: { stem: '甲', branch: '丑' } } })).toBeNull()
  })
})
