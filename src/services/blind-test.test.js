import { describe, expect, it } from 'vitest'
import { createBlindTest, evaluateBlindTest } from './blind-test'

describe('blind reading test', () => {
  it('creates three anonymous and distinct candidates with one answer', () => {
    const test = createBlindTest('戊', 'weak', 'participant-1')

    expect(test.candidates.map((candidate) => candidate.id)).toEqual(['A', 'B', 'C'])
    expect(new Set(test.candidates.map((candidate) => candidate.identity)).size).toBe(3)
    expect(test.candidates.some((candidate) => candidate.id === test.answerId)).toBe(true)
    expect(test.candidates.every((candidate) => !('title' in candidate))).toBe(true)
  })

  it('is deterministic for the same test seed', () => {
    expect(createBlindTest('甲', 'balanced', 'same-seed')).toEqual(
      createBlindTest('甲', 'balanced', 'same-seed')
    )
  })

  it('evaluates the selected candidate', () => {
    const test = createBlindTest('癸', 'strong', 'participant-2')

    expect(evaluateBlindTest(test, test.answerId).isCorrect).toBe(true)
    expect(() => evaluateBlindTest(test, '')).toThrow('กรุณาเลือกคำอ่าน')
  })
})
