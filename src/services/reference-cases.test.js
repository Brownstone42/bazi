import { describe, expect, it } from 'vitest'
import { buildReferenceCases } from '../../scripts/build-reference-case-snapshot.mjs'

describe('reference case candidates', () => {
  const cases = buildReferenceCases()

  it('contains 30 deterministic chart candidates', () => {
    expect(cases).toHaveLength(30)
    expect(new Set(cases.map((item) => item.id)).size).toBe(30)
    expect(cases.every((item) => Object.values(item.pillars).every(Boolean))).toBe(true)
  })

  it('covers five day-master elements', () => {
    const expectedElements = ['wood', 'fire', 'earth', 'metal', 'water']
    const counts = Object.fromEntries(expectedElements.map((element) => [element, 0]))
    cases.forEach((item) => { counts[item.dayMaster.element] += 1 })

    expect(Object.keys(counts)).toEqual(expectedElements)
    expect(Object.values(counts).every((count) => count >= 4)).toBe(true)
  })

  it('straddles the Li Chun and Zi-hour boundaries', () => {
    const beforeLiChun = cases.find((item) => item.id === 'RC-027')
    const afterLiChun = cases.find((item) => item.id === 'RC-028')
    const beforeZi = cases.find((item) => item.id === 'RC-024')
    const atZi = cases.find((item) => item.id === 'RC-025')

    expect(beforeLiChun.pillars.year).not.toBe(afterLiChun.pillars.year)
    expect(beforeLiChun.pillars.month).not.toBe(afterLiChun.pillars.month)
    expect(beforeZi.pillars.day).not.toBe(atZi.pillars.day)
  })

  it('contains a complete baseline hypothesis without over-ruling special charts', () => {
    expect(cases.every((item) => item.expected.status === 'baseline_hypothesis')).toBe(true)
    expect(cases.every((item) => item.expected.strengthLevel !== null)).toBe(true)
    expect(cases.every((item) => item.expected.rationale.length >= 2)).toBe(true)

    const possibleSpecial = cases.filter((item) => item.expected.patternType !== 'regular')
    expect(possibleSpecial.length).toBeGreaterThan(0)
    expect(possibleSpecial.every((item) => item.expected.primaryUsefulElement === null)).toBe(true)
  })
})
