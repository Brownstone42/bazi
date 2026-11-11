import { describe, expect, it } from 'vitest'
import { scoreSingleLove, summarizeLoveScore } from './single-love-score.js'
const topics = ['love-overview', 'love-meet', 'love-charm', 'love-caution', 'love-attraction']
const found = [{ id: 'a' }, { id: 'b' }]
describe('experimental question-specific scores', () => {
  it('summarizes net signed changes, not the absolute score or one negative factor', () => {
    for (const topic of topics) {
      for (const [delta, text] of [[-1.5, 'ต่ำกว่าปกติ'], [-1, 'ต่ำกว่าปกติ'], [-0.5, 'น้อยกว่าปกติเล็กน้อย'], [-0.25, 'น้อยกว่าปกติเล็กน้อย'], [0, 'ใกล้เคียงปกติ'], [0.5, 'มากกว่าปกติเล็กน้อย'], [1, 'สูงกว่าปกติ']]) {
        expect(summarizeLoveScore(topic, delta)).toContain(text)
      }
      expect(summarizeLoveScore(topic, null)).toBeNull()
    }
    const score = scoreSingleLove({ topic: 'love-overview', status: 'neutral', peach: found, friction: found })
    expect(score.delta).toBe(0)
    expect(score.summary).toContain('ใกล้เคียงปกติ')
    expect(summarizeLoveScore('love-caution', -1)).toContain('สื่อสารกันได้ราบรื่นต่ำกว่าปกติ')
  })
  it('explains a deduction using the actual branch contact and group weight', () => {
    const score = scoreSingleLove({ topic: 'love-caution', status: 'unresolved', friction: [{ id: 'day-day-CLASH', interactionType: 'CLASH', text: 'วันจร: ชง 子–午 กับเสาวัน (วังคู่ครอง)' }] })
    expect(score.factors[0]).toMatchObject({ delta: -1, label: 'กิ่งวันจรชงกิ่งวันเกิด', details: [{ id: 'day-day-CLASH', text: 'วันจร: ชง 子–午 กับเสาวัน (วังคู่ครอง)' }] })
    expect(score.factors[0].weightNote).toContain('หัก 1 คะแนนต่อกลุ่ม')
    expect(score.factors[0].label).not.toContain('จังหวะที่ต้องปรับ')
  })
  it('links structure deductions to the actual contributing transit changes', () => {
    const score = scoreSingleLove({ topic: 'love-overview', status: 'caution', transits: { layers: [
      { key: 'day', ganZhi: '甲子', status: 'caution', changes: [{ id: 'day-conflict', direction: 'caution', text: 'วันจรเพิ่มน้ำหนักฝ่ายขัด: 1 → 2' }, { id: 'review', direction: 'review', text: 'ไม่สรุป' }] },
      { key: 'month', ganZhi: '乙丑', status: 'unresolved', changes: [{ id: 'unknown', direction: 'caution', text: 'ยังไม่สรุป' }] },
    ] } })
    expect(score.factors[0].sourceIds).toEqual(['day-conflict'])
    expect(score.factors[0].details[0].text).toContain('甲子')
    expect(score.factors[0].details[0].text).toContain('1 → 2')
  })
  it('shows only contributing groups and does not double count references', () => {
    const args = { topic: 'love-charm', status: 'neutral', peach: found, combine: found }
    const score = scoreSingleLove(args)
    expect(score.value).toBe(3.5)
    expect(score.factors.map(item => item.id)).toEqual(['peach'])
    expect(scoreSingleLove({ ...args, peach: found.slice(0, 1) }).value).toBe(score.value)
    expect(scoreSingleLove({ ...args, topic: 'love-caution' }).factors.map(item => item.id)).toEqual(['combine'])
  })
  it('omits unresolved structure without discarding independent signed factors', () => {
    for (const topic of topics) {
      const score = scoreSingleLove({ topic, status: 'unresolved', peach: found })
      expect(score.factors.some(item => item.id.startsWith('structure'))).toBe(false)
      if (topic === 'love-caution') {
        expect(score.value).toBeNull()
        expect(score.factors).toEqual([])
      } else {
        expect(score.value).toBeGreaterThan(2.5)
        expect(score.factors.map(item => item.id)).toEqual(['peach'])
      }
      expect(score.reason).toBeUndefined()
    }
  })
  it('reconciles every displayed score with its factors and stays within 0–5', () => {
    for (const topic of topics) for (const status of ['supportive', 'caution', 'mixed', 'neutral', 'unresolved']) {
      for (let mask = 0; mask < 8; mask++) {
        const score = scoreSingleLove({ topic, status, peach: mask & 1 ? found : [], combine: mask & 2 ? found : [], friction: mask & 4 ? found : [] })
        if (!score.factors.length) {
          expect(score.value).toBeNull()
          continue
        }
        expect(score.value).toBe(score.baseline + score.factors.reduce((sum, item) => sum + item.delta, 0))
        expect(score.value).toBeGreaterThanOrEqual(0)
        expect(score.value).toBeLessThanOrEqual(5)
        expect(score.factors.every(item => item.delta !== 0 && item.sourceIds.length)).toBe(true)
      }
    }
  })
})
