import { describe, expect, it } from 'vitest'
import {
  DAY_MASTER_MATRIX_VERSION,
  dayMasterStrengthMatrix,
  getDayMasterStrengthReading,
  publicStrengthPresentation,
  strengthLevelLabels
} from './day-master-strength-matrix'

const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const levels = ['very_strong', 'strong', 'balanced', 'weak', 'very_weak']
const fields = ['identity', 'strength', 'risk', 'work', 'relationship', 'finance']

describe('day master × strength reading matrix', () => {
  it('contains all 50 complete reading combinations', () => {
    expect(Object.keys(dayMasterStrengthMatrix)).toEqual(stems)
    expect(Object.keys(strengthLevelLabels)).toEqual(levels)

    const readings = stems.flatMap((stem) => levels.map((level) => {
      const reading = getDayMasterStrengthReading(stem, level)
      expect(reading.title).toBeTruthy()
      expect(reading.strengthPresentation.label.length).toBeGreaterThan(10)
      expect(reading.strengthPresentation.explanation).toContain(`“ดิถี${strengthLevelLabels[level]}”`)
      fields.forEach((field) => expect(reading[field]?.length).toBeGreaterThan(20))
      return fields.map((field) => reading[field]).join('|')
    }))

    expect(readings).toHaveLength(50)
    expect(new Set(readings).size).toBe(50)
  })

  it('uses public-facing strength wording for every combination', () => {
    expect(Object.keys(publicStrengthPresentation)).toEqual(levels)

    stems.forEach((stem) => {
      levels.forEach((level) => {
        const reading = getDayMasterStrengthReading(stem, level)
        expect(reading.strengthPresentation.label).not.toBe(strengthLevelLabels[level])
        expect(reading.strengthPresentation.explanation).toContain('ไม่ได้หมาย')
      })
    })
  })

  it('gives every strength level a distinct reading for the same day master', () => {
    stems.forEach((stem) => {
      fields.forEach((field) => {
        const values = levels.map((level) => getDayMasterStrengthReading(stem, level)[field])
        expect(new Set(values).size).toBe(levels.length)
      })
    })
  })

  it('publishes a traceable baseline content version', () => {
    expect(DAY_MASTER_MATRIX_VERSION).toMatch(/^day-master-matrix\/\d+\.\d+\.\d+$/)
  })

  it('does not reintroduce phrases identified as unclear in the Thai editorial review', () => {
    const content = JSON.stringify(dayMasterStrengthMatrix)
    const unclearPhrases = [
      'แสดงพลังอย่างเลือกสรร',
      'พลังปรากฏตัวสูง',
      'ตัดสินใจยาก',
      'ข้อมูลคานอำนาจ',
      'วิธีส่งสาร',
      'จังหวะส่องรายละเอียด',
      'พูดตรงเกินจังหวะ',
      'งานมีกรอบ',
      'งานขอบเขตชัด'
    ]

    unclearPhrases.forEach((phrase) => expect(content).not.toContain(phrase))
  })
})
