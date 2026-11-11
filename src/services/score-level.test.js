import { it, expect } from 'vitest'
import { scoreLevel } from './score-level.js'
it('uses non-overlapping boundaries for all four display levels', () => {
  expect([0, 45, 46, 60, 61, 75, 76, 100].map(score => scoreLevel(score).label)).toEqual(['ควรระวัง', 'ควรระวัง', 'กลาง ๆ', 'กลาง ๆ', 'ดี', 'ดี', 'ดีมาก', 'ดีมาก'])
  expect(new Set([0, 46, 61, 76].map(score => scoreLevel(score).color)).size).toBe(4)
})
