import { describe, it, expect } from 'vitest'
import { evaluateStructureResolution } from './structure-resolution.js'
import { assessTenGodStrength } from './ten-god-strength.js'
import { analyzeRegularStructure } from './regular-structure.js'
import { calculateChart } from './bazi.js'

// Isolated symbolic fixture, not a claimed calendar birth chart.
const fixture = () => ({ dayMaster: { char: '甲', element: 'wood' }, interactions: [], pillars: {
  year: { stem: '癸', branch: '子', hiddenStems: [{ stem: '癸', isMain: true }] },
  month: { stem: '丁', branch: '酉', hiddenStems: [{ stem: '辛', isMain: true }] },
  day: { stem: '甲', branch: '午', hiddenStems: [{ stem: '丁', isMain: true }] },
  hour: { stem: '辛', branch: '酉', hiddenStems: [{ stem: '辛', isMain: true }] },
} })
function evaluate(chart = fixture(), overrides = {}) {
  return evaluateStructureResolution({ chart, tenGodStrength: assessTenGodStrength(chart), focus: '正官', structureStatus: 'candidate', helpers: ['正印', '偏印'], cautions: ['伤官', '七杀'], ...overrides })
}
const rescue = result => result.conflicts.find(item => item.god === '伤官').rescues.find(item => item.god === '正印')

describe('structure support, obstruction and bounded rescue', () => {
  it('requires visible rooted capacity and compares weights before proposing a route', () => {
    const result = evaluate()
    expect(result.conflicts).toHaveLength(1)
    expect(rescue(result).index).toBeGreaterThan(result.conflicts[0].index)
    expect(rescue(result).status).toBe('conditional-route')
    expect(result.status).toBe('conditional-rescue')
    expect(result.summary).toContain('ยังไม่ยืนยันว่าแก้สำเร็จ')
  })
  it('does not invent a missing rescuer or promote a hidden-only one', () => {
    const hidden = fixture(); hidden.pillars.year.stem = '甲'
    expect(rescue(evaluate(hidden)).capacityStatus).toBe('latent')
    expect(rescue(evaluate(hidden)).status).toBe('needs-review')
    const missing = fixture(); missing.pillars.year = { stem: '甲', branch: '寅', hiddenStems: [{ stem: '甲', isMain: true }] }
    expect(rescue(evaluate(missing)).status).toBe('missing')
    expect(evaluate(missing).status).toBe('conflict-needs-review')
  })
  it('rejects unrooted or weaker rescuer even when the god name matches', () => {
    const chart = fixture(); chart.pillars.year.hiddenStems = [{ stem: '乙', isMain: true }]
    expect(rescue(evaluate(chart)).capacityStatus).toBe('unrooted')
    const strength = assessTenGodStrength(fixture())
    strength.gods.find(item => item.god === '正印').strengthIndex = 0.8
    const result = evaluate(fixture(), { tenGodStrength: strength })
    expect(rescue(result).capacityStatus).toBe('weak')
    expect(rescue(result).reasons.join()).toContain('ต่ำกว่าฝ่ายขัด')
  })
  it('retains a secondary obstruction instead of deleting the original conflict', () => {
    const chart = fixture(); chart.pillars.day.hiddenStems.push({ stem: '戊' })
    const result = evaluate(chart)
    expect(rescue(result).impediments.map(item => item.god)).toContain('偏财')
    expect(rescue(result).status).toBe('needs-review')
    expect(result.conflicts[0].god).toBe('伤官')
  })
  it('flags root interactions and distant visible positions', () => {
    const chart = fixture(); chart.interactions = [{ type: 'CLASH', pillars: ['year', 'day'], branches: ['子', '午'] }]
    expect(rescue(evaluate(chart)).status).toBe('needs-review')
    const distant = fixture()
    const strength = assessTenGodStrength(distant)
    strength.gods.find(item => item.god === '伤官').visible[0].position = 'hour'
    expect(rescue(evaluate(distant, { tenGodStrength: strength })).reasons.join()).toContain('ใกล้ก้านฝ่ายขัด')
  })
  it('does not manufacture rescue rules for uncovered or ambiguous structures', () => {
    const chart = fixture(); chart.pillars.year.stem = '庚'
    const result = evaluate(chart)
    expect(result.conflicts.find(item => item.god === '七杀').routeStatus).toBe('not-covered')
    const ambiguous = evaluate(fixture(), { structureStatus: 'unresolved' })
    expect(ambiguous.status).toBe('out-of-scope')
    expect(rescue(ambiguous).status).not.toBe('conditional-route')
  })
  it('requires an available helper even when no conflict is detected', () => {
    const result = evaluate(fixture(), { cautions: [], helpers: ['正印'] })
    expect(result.status).toBe('supported-candidate')
    const missing = evaluate(fixture(), { cautions: [], helpers: ['偏印'] })
    expect(missing.status).toBe('support-not-established')
    const blockedFocus = fixture()
    blockedFocus.interactions = [{ type: 'HARM', pillars: ['month', 'hour'], branches: ['酉', '酉'] }]
    expect(evaluate(blockedFocus, { cautions: [] }).status).toBe('focus-needs-review')
  })
  it.each([
    ['正财', '劫财', ['食神'], '食神'], ['偏财', '劫财', ['食神'], '正官'],
    ['正印', '正财', ['正官'], '劫财'], ['偏印', '偏财', ['正官'], '劫财'],
    ['食神', '偏印', ['正财'], '正财'], ['七杀', '偏印', ['食神'], '偏财'],
  ])('checks the covered route %s against %s', (focus, threat, helpers, expected) => {
    const chart = fixture(), strength = assessTenGodStrength(chart)
    // Force presence only; this tests catalogue routing, not sufficiency.
    const opponent = strength.gods.find(item => item.god === threat)
    opponent.presence = 'hidden-only'; opponent.strengthIndex = 0.2
    const result = evaluate(chart, { tenGodStrength: strength, focus, helpers, cautions: [threat] })
    expect(result.conflicts.find(item => item.god === threat).rescues.map(item => item.god)).toContain(expected)
  })
  it('is deterministic, keeps evidence unique and integrates actual chart strength', () => {
    const chart = calculateChart({ birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' })
    const before = JSON.stringify(chart)
    const result = analyzeRegularStructure(chart)
    expect(result).toEqual(analyzeRegularStructure(chart))
    expect(JSON.stringify(chart)).toBe(before)
    expect(new Set(result.evidence.map(item => item.id)).size).toBe(result.evidence.length)
    for (const support of result.resolution.supports) expect(support.index).toBe(result.tenGodStrength.gods.find(item => item.god === support.god).strengthIndex)
  })
})
