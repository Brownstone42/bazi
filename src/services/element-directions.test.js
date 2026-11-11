import { it, expect } from 'vitest'
import { elementDirections } from './element-directions.js'
it('maps five elements to exactly eight compass directions without a center', () => {
  const directions = Object.values(elementDirections).flat()
  expect(directions).toHaveLength(8)
  expect(new Set(directions).size).toBe(8)
  expect(elementDirections.earth).toEqual(['ตะวันออกเฉียงเหนือ', 'ตะวันตกเฉียงใต้'])
  expect(elementDirections.metal).toEqual(['ตะวันตก', 'ตะวันตกเฉียงเหนือ'])
  expect(directions.join(' ')).not.toContain('กลาง')
})
