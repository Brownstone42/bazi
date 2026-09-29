import { describe, expect, it } from 'vitest'
import { calculateBaziChart } from '@openfate/bazi-engine'
import { referenceInputs, buildReferenceCases } from '../../scripts/build-reference-case-snapshot.mjs'
import { assessDayMasterStrength, evaluateElementRoles } from './strength-engine'

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
  it.each([['earth', 'wood'], ['wood', 'metal'], ['fire', 'water'], ['metal', 'fire'], ['water', 'earth']])('considers the controller for strong %s but not weak charts', (master, controller) => {
    const strong = evaluateElementRoles(master, 'strong')
    expect(strong.supportiveElements).toContain(controller)
    expect(strong.elementAssessments[controller]).toMatchObject({ status: 'supportive', relation: 'power' })
    expect(evaluateElementRoles(master, 'weak').elementAssessments[controller].status).toBe('caution')
    expect(evaluateElementRoles(master, 'balanced').elementAssessments[controller].status).toBe('neutral')
    expect(evaluateElementRoles(master, 'very_strong', 'possible_dominant').elementAssessments[controller].status).toBe('unresolved')
  })
  it('assesses all five elements explicitly and preserves climate priority', () => {
    const assessment = evaluateElementRoles('earth', 'strong')
    expect(Object.keys(assessment.elementAssessments)).toHaveLength(5)
    expect(Object.values(assessment.elementAssessments).every(item => item.reason && item.relation)).toBe(true)
    const cold = evaluateElementRoles('earth', 'strong', 'regular', { required: true, preferredElement: 'fire' })
    expect(cold.primaryUsefulElement).toBe('fire')
    expect(cold.elementAssessments.wood.status).not.toBe('supportive')
  })
  it('is deterministic and emits traceable evidence', () => {
    const chart = chartFor(referenceInputs[0])
    const first = assessDayMasterStrength(chart)
    const second = assessDayMasterStrength(chart)

    expect(first).toEqual(second)
    expect(first.evidence.length).toBeGreaterThan(2)
    expect(first.evidence.every((item) => item.id && item.rule && item.message)).toBe(true)
    expect(first.ruleVersion).toBe('strength/0.2.0')
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
