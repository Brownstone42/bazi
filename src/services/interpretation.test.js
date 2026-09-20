import { describe, expect, it } from 'vitest'
import { calculateChart } from './bazi'
import { interpretNatalChart } from './interpretation'

describe('natal chart interpretation', () => {
  it('returns traceable Thai insights for the default chart', () => {
    const chart = calculateChart({
      birthDate: '26/08/1989',
      birthTime: '11:30',
      gender: 'male',
      timezoneId: 'Asia/Bangkok'
    })
    const reading = interpretNatalChart(chart)

    expect(reading.headline).toBeTruthy()
    expect(reading.cards).toHaveLength(5)
    expect(reading.lifeAreas).toHaveLength(6)
    expect(reading.lifeAreas.map((area) => area.id)).toEqual([
      'social-world',
      'career-path',
      'money-style',
      'home-partner',
      'future-output',
      'wellbeing'
    ])
    expect(reading.lifeAreas.find((area) => area.id === 'career-path')?.recommendations.length).toBeGreaterThanOrEqual(4)
    expect(reading.lifeAreas.every((area) => area.shouldDo && area.shouldAvoid)).toBe(true)
    expect(reading.cards.every((card) => card.evidence.length > 0)).toBe(true)
    expect(reading.cards.some((card) => card.evidence.some((item) => item.startsWith('กำลังของดิถี:')))).toBe(true)
    expect(reading.cards.some((card) => card.evidence.some((item) => item.startsWith('ธาตุให้คุณหลัก:')))).toBe(true)
    expect(reading.methodology).toContain('ธาตุให้คุณ')
    expect(reading.contentVersion).toBe('day-master-matrix/0.3.0')
    expect(reading.cards.find((card) => card.id === 'finance')?.text).toBeTruthy()
    expect(reading.headline).not.toMatch(/แข็งมาก|แข็ง|สมดุล|อ่อนมาก|อ่อน/)
    expect(reading.strengthPresentation.label).toBeTruthy()
    expect(reading.strengthPresentation.explanation).toContain('ในทางเทคนิค')
  })

  it('changes the complete reading when the same day master has a different strength', () => {
    const chart = calculateChart({
      birthDate: '26/08/1989',
      birthTime: '11:30',
      gender: 'male',
      timezoneId: 'Asia/Bangkok'
    })
    const baseAssessment = {
      structureClarity: 'clear',
      patternType: 'regular',
      primaryUsefulElement: 'wood'
    }
    const strong = interpretNatalChart(chart, { ...baseAssessment, strengthLevel: 'strong' })
    const weak = interpretNatalChart(chart, { ...baseAssessment, strengthLevel: 'weak' })

    expect(strong.headline).toBe(weak.headline)
    expect(strong.summary).not.toBe(weak.summary)
    expect(strong.cards.map((card) => card.text)).not.toEqual(weak.cards.map((card) => card.text))
    expect(strong.lifeAreas.find((area) => area.id === 'wellbeing')?.text)
      .not.toBe(weak.lifeAreas.find((area) => area.id === 'wellbeing')?.text)
    expect(strong.lifeAreas.find((area) => area.id === 'wellbeing')?.shouldAvoid)
      .not.toBe(weak.lifeAreas.find((area) => area.id === 'wellbeing')?.shouldAvoid)
  })

  it('keeps customer-facing life readings free from technical astrology terms', () => {
    const chart = calculateChart({
      birthDate: '26/08/1989',
      birthTime: '11:30',
      gender: 'male',
      timezoneId: 'Asia/Bangkok'
    })
    const reading = interpretNatalChart(chart)
    const publicText = reading.lifeAreas.flatMap((area) => [
      area.title,
      area.verdict,
      area.text,
      area.environment,
      area.shouldDo,
      area.shouldAvoid,
      ...(area.recommendations ?? [])
    ]).filter(Boolean).join(' ')

    expect(publicText).not.toMatch(/ดิถี|ก้านฟ้า|กิ่งดิน|สิบเทพ|ธาตุให้คุณ|[一-龥]/)
  })

  it('keeps the health disclaimer separate from personalized avoidance guidance', () => {
    const chart = calculateChart({
      birthDate: '26/08/1989',
      birthTime: '11:30',
      gender: 'male',
      timezoneId: 'Asia/Bangkok'
    })
    const wellbeing = interpretNatalChart(chart).lifeAreas.find((area) => area.id === 'wellbeing')

    expect(wellbeing.shouldAvoid).not.toMatch(/วินิจฉัยโรค|ปรับยา|พบแพทย์/)
    expect(wellbeing.shouldAvoid.length).toBeGreaterThan(60)
    expect(wellbeing.disclaimer).toContain('ปรึกษาแพทย์')
  })
})
