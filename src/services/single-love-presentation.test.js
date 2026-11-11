import { describe, expect, it } from 'vitest'
import { presentSingleLove } from './single-love-presentation.js'
import { buildSingleLoveReadings, singleLoveQuestions } from './single-love.js'

const facts = { style: 'อบอุ่นและรับฟัง', action: 'ฟังโดยไม่รีบเสนอวิธีแก้ปัญหา', caution: 'อย่าละเลยความต้องการของตัวเอง', friction: false, connection: false, monthTension: false }
describe('plain-language love readings', () => {
  for (const status of ['supportive', 'caution', 'mixed', 'unresolved', 'neutral']) {
    it(`presents five distinct, jargon-free answers for ${status}`, () => {
      const answers = singleLoveQuestions.map(({ id }) => presentSingleLove({ ...facts, topic: id, status }))
      expect(new Set(answers.map(answer => answer.headline)).size).toBe(5)
      for (const answer of answers) {
        expect(answer.actions).toHaveLength(2)
        expect(answer.reasons.length).toBeGreaterThanOrEqual(2)
        expect(JSON.stringify(answer)).not.toMatch(/[\u3400-\u9fff]|สิบเทพ|ก้านซ่อน|วังคู่ครอง|\d+%/)
      }
      expect(answers[4].headline).toContain('ยังบอกไม่ได้')
      if (status === 'unresolved') expect(answers[0].headline).toContain('ยังไม่มีแนวโน้มชัด')
    })
  }
  it('keeps mixed evidence and slower monthly context in the explanation', () => {
    const answer = presentSingleLove({ ...facts, topic: 'love-overview', status: 'mixed', friction: true, connection: true, monthTension: true })
    expect(answer.reasons.join(' ')).toContain('ทั้งด้านสนับสนุนและด้านที่ควรระวัง')
    expect(answer.reasons.join(' ')).toContain('ช่วงเดือน')
    expect(answer.caution).toContain('ถ้าไม่แน่ใจให้ถามก่อน')
  })
  it('attaches all five presentations without removing their calculation evidence', () => {
    const result = buildSingleLoveReadings({ input: { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }, date: '2026-10-12' })
    expect(result.readings).toHaveLength(5)
    for (const reading of result.readings) {
      expect(reading.presentation.headline).toBeTruthy()
      expect(reading.evidence.length).toBeGreaterThan(0)
      expect(reading.transits).toBe(result.transits)
    }
  })
})
