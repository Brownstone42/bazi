import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CompatibilityScore from '../components/CompatibilityScore.vue'
import { calculateChart } from './bazi'
import { calculateCompatibilityScore } from './compatibility-score'

const make = (date, time = '11:30') => calculateChart({ birthDate: date, birthTime: time, gender: 'male', timezoneId: 'Asia/Bangkok' })
const first = make('26/08/1989')
const second = make('04/02/1990')

describe('compatibility scoring v1', () => {
  it('keeps the example couple topic scores traceable without forcing different totals', () => {
    const other = make('02/04/1992', '18:55')
    const topics = ['overview', 'love', 'family', 'work', 'friendship']
    const scores = topics.map(focus => calculateCompatibilityScore(first, other, { focus, hasBirthTime: true }))
    expect(scores.map(result => result.value)).toEqual([61, 60, 60, 60, 64])
    expect(new Set(scores.map(result => result.forward.components[0].value)).size).toBe(1)
    expect(new Set(scores.map(result => result.forward.components[2].value)).size).toBe(1)
    expect(new Set(scores.map(result => result.forward.components[1].value)).size).toBeGreaterThan(1)
  })

  it('is deterministic, bounded and reverses directions when swapping people', () => {
    const result = calculateCompatibilityScore(first, second, { focus: 'love' })
    const swapped = calculateCompatibilityScore(second, first, { focus: 'love' })
    expect(result).toEqual(calculateCompatibilityScore(first, second, { focus: 'love' }))
    expect(result.forward).toEqual(swapped.reverse)
    expect(result.reverse).toEqual(swapped.forward)
    expect(result.value).toBe(swapped.value)
    for (const direction of [result.forward, result.reverse]) {
      if (direction.value === null) continue
      expect(direction.value).toBeGreaterThanOrEqual(0)
      expect(direction.value).toBeLessThanOrEqual(100)
      expect(direction.components.map(item => item.weight)).toEqual([40, 40, 20])
    }
  })

  it('does not read the placeholder hour or mutate input when time is unknown', () => {
    const alternate = structuredClone(second)
    alternate.pillars.hour = first.pillars.hour
    const before = JSON.stringify(second)
    expect(calculateCompatibilityScore(first, second, { hasBirthTime: false })).toEqual(calculateCompatibilityScore(first, alternate, { hasBirthTime: false }))
    expect(JSON.stringify(second)).toBe(before)
    expect(calculateCompatibilityScore(first, second, { hasBirthTime: false }).note).toContain('23:00')
  })

  it('weights positions by topic and uses overview for unknown topics', () => {
    const a = structuredClone(first)
    const b = structuredClone(first)
    a.pillars.day.branch = '子'
    b.pillars.day.branch = '丑'
    a.pillars.month.branch = '子'
    b.pillars.month.branch = '午'
    const love = calculateCompatibilityScore(a, b, { focus: 'love' })
    const work = calculateCompatibilityScore(a, b, { focus: 'work' })
    expect(love.forward.components[1].value).toBeGreaterThan(work.forward.components[1].value)
    expect(calculateCompatibilityScore(first, second, { focus: 'unknown' })).toEqual(calculateCompatibilityScore(first, second, { focus: 'overview' }))
  })

  it('renders both directions and handles withheld scores without NaN', () => {
    const score = calculateCompatibilityScore(first, second)
    const wrapper = mount(CompatibilityScore, { props: { score, name: 'คุณเอ' } })
    expect(wrapper.text()).toContain('คุณ ส่งเสริม คุณเอ')
    expect(wrapper.text()).toContain('คุณเอ ส่งเสริม คุณ')
    expect(wrapper.findAll('meter')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('น้ำหนัก')
    expect(wrapper.text()).not.toContain(score.forward.explanation)
    expect(wrapper.text()).not.toContain('NaN')
    const withheld = mount(CompatibilityScore, { props: { score: { ...score, value: null, forward: { value: null, components: [] }, reverse: { value: null, components: [] } } } })
    expect(withheld.text()).toContain('—')
    expect(withheld.findAll('meter')).toHaveLength(0)
  })
})
