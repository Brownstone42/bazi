import { describe, it, expect } from 'vitest'
import { assessTenGodStrength } from './ten-god-strength.js'
import { calculateChart } from './bazi.js'
import { calculateTenGod } from '@openfate/bazi-engine'

const fixture = () => ({ dayMaster: { char: '甲' }, interactions: [], pillars: {
  year: { stem: '丙', branch: '巳', hiddenStems: [{ stem: '丙', isMain: true }, { stem: '戊' }, { stem: '庚' }] },
  month: { stem: '乙', branch: '卯', hiddenStems: [{ stem: '乙', isMain: true }] },
  day: { stem: '甲', branch: '寅', hiddenStems: [{ stem: '甲', isMain: true }, { stem: '丙' }, { stem: '戊' }] },
  hour: { stem: '辛', branch: '酉', hiddenStems: [{ stem: '辛', isMain: true }] },
} })
const get = (result, stem) => result.gods.find(item => item.stem === stem)
describe('ten god strength baseline', () => {
  it('returns ten distinct polarity-sensitive gods relative to the natal DM', () => {
    for (const dm of [...'甲乙丙丁戊己庚辛壬癸']) {
      const chart = fixture(); chart.dayMaster.char = dm; chart.pillars.day.stem = dm
      const result = assessTenGodStrength(chart)
      expect(new Set(result.gods.map(item => item.god)).size).toBe(10)
      for (const god of result.gods) expect(god.god).toBe(calculateTenGod(dm, god.stem))
    }
  })
  it('does not count the DM as a visible companion or duplicate roots as mass', () => {
    const result = assessTenGodStrength(fixture())
    const self = get(result, '甲')
    expect(self.visibleMass).toBe(0)
    expect(self.hiddenMass).toBeCloseTo(1.2 * 0.6)
    expect(self.strengthIndex).toBeCloseTo(0.72 * 1.4)
    expect(self.roots).toHaveLength(1)
    expect(self.elementRoots).toHaveLength(1)
    expect(result.gods.reduce((sum, god) => sum + god.rawMass, 0)).toBeCloseTo(7.8) // 3.3 visible + 4.5 branch mass
  })
  it('does not invent strength for absent gods even with seasonal support', () => {
    const result = assessTenGodStrength(fixture())
    expect(get(result, '丁').season.value).toBeGreaterThan(0)
    expect(get(result, '丁').strengthIndex).toBe(0)
    expect(get(result, '丁').presence).toBe('absent')
  })
  it('separates hidden-only, visible unrooted and rooted occurrences', () => {
    const chart = fixture(); chart.pillars.hour.stem = '壬'
    const result = assessTenGodStrength(chart)
    expect(get(result, '戊').presence).toBe('hidden-only')
    expect(get(result, '壬').presence).toBe('visible-without-exact-root')
    expect(get(result, '乙').presence).toBe('visible-with-exact-root')
  })
  it('changes seasonal factor without changing natal occurrence mass', () => {
    const a = fixture(), b = fixture(); b.pillars.month.branch = '酉'
    const spring = get(assessTenGodStrength(a), '乙'), autumn = get(assessTenGodStrength(b), '乙')
    expect(spring.rawMass).toBe(autumn.rawMass)
    expect(spring.strengthIndex).toBeGreaterThan(autumn.strengthIndex)
  })
  it('honors explicit main qi and preserves hidden mass instead of counting every stem equally', () => {
    const a = fixture(), b = fixture()
    b.pillars.year.hiddenStems = [a.pillars.year.hiddenStems[1], a.pillars.year.hiddenStems[0], a.pillars.year.hiddenStems[2]]
    expect(assessTenGodStrength(b)).toEqual(assessTenGodStrength(a))
    const result = assessTenGodStrength(a)
    expect(get(result, '丙').roots.find(item => item.position === 'year').mass).toBe(0.6)
    expect(get(result, '庚').roots[0].mass).toBe(0.1)
  })
  it('flags affected roots without treating clashes as automatic loss of qi', () => {
    const a = fixture(), b = fixture()
    b.interactions = [{ type: 'CLASH', pillars: ['month', 'hour'], branches: ['卯', '酉'] }]
    const before = get(assessTenGodStrength(a), '乙'), after = get(assessTenGodStrength(b), '乙')
    expect(after.strengthIndex).toBe(before.strengthIndex)
    expect(after.certainty).toBe('needs-review')
    expect(after.interactions).toHaveLength(1)
  })
  it('validates missing or malformed chart data', () => {
    expect(() => assessTenGodStrength(null)).toThrow()
    const chart = fixture(); chart.pillars.hour.hiddenStems = []
    expect(() => assessTenGodStrength(chart)).toThrow()
    chart.pillars.hour.hiddenStems = [{ stem: '辛' }, { stem: '辛' }]
    expect(() => assessTenGodStrength(chart)).toThrow()
  })
  it('is deterministic on engine charts and preserves input', () => {
    const chart = calculateChart({ birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' })
    const before = JSON.stringify(chart)
    const a = assessTenGodStrength(chart)
    expect(a).toEqual(assessTenGodStrength(chart))
    expect(JSON.stringify(chart)).toBe(before)
    for (const god of a.gods) {
      expect(Number.isFinite(god.strengthIndex)).toBe(true)
      expect(new Set(god.evidence.map(item => item.id)).size).toBe(god.evidence.length)
    }
  })
})
