import { describe, it, expect } from 'vitest'
import { dailyTheme, dailyHeadline } from './daily-headline.js'

const reading = (pillar, score = 60) => ({ contextPillars: { day: pillar }, personalScore: score })
const chart = { dayMaster: { char: '戊' }, pillars: { day: { branch: '午' }, year: { branch: '巳' } } }

describe('preview daily themes', () => {
  it('distinguishes all ten gods for every day master, including yin masters', () => {
    for (const dm of [...'甲乙丙丁戊己庚辛壬癸']) {
      const results = [...'甲乙丙丁戊己庚辛壬癸'].map(stem => dailyTheme(reading(`${stem}辰`), { dayMaster: { char: dm } }))
      expect(new Set(results.map(item => item.god)).size).toBe(10)
      expect(new Set(results.map(item => item.title)).size).toBe(10)
      expect(results.every(item => item.title !== 'วันวางแผนของคุณ')).toBe(true)
    }
    expect(dailyTheme(reading('庚辰'), chart).god).toBe('食神')
    expect(dailyTheme(reading('辛巳'), chart).god).toBe('伤官')
  })
  it('uses the shared caution boundary without treating repetition as punishment', () => {
    expect(dailyHeadline(reading('丙午', 45), chart)).toBe('วันระวังคิดวน')
    expect(dailyHeadline(reading('丙午', 46), chart)).toBe('วันค้นพบมุมใหม่')
    expect(dailyHeadline(reading('丙午', 76), chart)).toBe('วันค้นพบมุมใหม่')
  })
  it('prioritizes actual natal clashes without changing scores or unrelated branches', () => {
    const day = reading('戊子', 90)
    const before = JSON.stringify(day)
    expect(dailyTheme(day, chart).reason).toBe('clash-day')
    expect(dailyHeadline(reading('丁亥'), chart)).toBe('วันชงปีเกิด')
    expect(dailyHeadline(reading('丁亥'), { ...chart, pillars: { year: { branch: '卯' } } })).toBe('วันรับแรงสนับสนุน')
    expect(JSON.stringify(day)).toBe(before)
  })
  it('does not invent a theme for missing or unscored data', () => {
    expect(dailyTheme(null, chart).reason).toBe('unavailable')
    expect(dailyTheme(reading('庚辰'), null).reason).toBe('unavailable')
    expect(dailyTheme({ contextPillars: { day: '庚辰' } }, chart).reason).toBe('unavailable')
  })
})
