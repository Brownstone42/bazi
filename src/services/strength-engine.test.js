import { describe, expect, it } from 'vitest'
import { calculateBaziChart } from '@openfate/bazi-engine'
import { referenceInputs, buildReferenceCases } from '../../scripts/build-reference-case-snapshot.mjs'
import { assessDayMasterStrength } from './strength-engine'

function chartFor(input) {
  const [year, month, day] = input.birthDate.split('-').map(Number)
  const [hour, minute] = input.birthTime.split(':').map(Number)
  return calculateBaziChart({
    year,
    month,
    day,
    hour,
    minute,
    gender: input.gender,
    timezoneId: input.timezoneId,
    enableTrueSolarTime: false,
    dayBoundaryMode: 'ZI_HOUR_23',
    calendarType: 'solar'
  })
}

describe('strength rule engine', () => {
  it('is deterministic and emits traceable evidence', () => {
    const chart = chartFor(referenceInputs[0])
    const first = assessDayMasterStrength(chart)
    const second = assessDayMasterStrength(chart)

    expect(first).toEqual(second)
    expect(first.evidence.length).toBeGreaterThan(2)
    expect(first.evidence.every((item) => item.id && item.rule && item.message)).toBe(true)
    expect(first.ruleVersion).toBe('strength/0.1.0')
  })

  it('never chooses useful elements for a possible special structure', () => {
    const assessments = referenceInputs.map((input) => assessDayMasterStrength(chartFor(input)))
    const possibleSpecial = assessments.filter((item) => item.patternType !== 'regular')

    expect(possibleSpecial.length).toBeGreaterThan(0)
    expect(possibleSpecial.every((item) => item.primaryUsefulElement === null)).toBe(true)
    expect(possibleSpecial.every((item) => item.supportiveElement === null)).toBe(true)
  })

  it('matches the 30 baseline hypotheses', () => {
    const references = buildReferenceCases()
    const mismatches = references.flatMap((reference, index) => {
      const actual = assessDayMasterStrength(chartFor(referenceInputs[index]))
      const fields = ['strengthLevel', 'patternType', 'primaryUsefulElement', 'supportiveElement', 'structureClarity']
      return fields
        .filter((field) => actual[field] !== reference.expected[field])
        .map((field) => `${reference.id}.${field}: expected ${reference.expected[field]}, received ${actual[field]}`)
    })

    expect(mismatches, mismatches.join('\n')).toEqual([])
  })
})
