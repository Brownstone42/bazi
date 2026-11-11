import { describe, expect, it } from 'vitest'
import { analyzeStructureTransits } from './structure-transits.js'
import { analyzeRegularStructure } from './regular-structure.js'
import { buildSingleLoveReadings } from './single-love.js'

// Isolated natal fixture; no claim this is a real calendar birth chart.
const chart = () => ({ dayMaster: { char: '甲', element: 'wood' }, interactions: [], pillars: {
  year: { stem: '戊', branch: '辰', hiddenStems: [{ stem: '戊', isMain: true }] },
  month: { stem: '辛', branch: '酉', hiddenStems: [{ stem: '辛', isMain: true }] },
  day: { stem: '甲', branch: '寅', hiddenStems: [{ stem: '甲', isMain: true }] },
  hour: { stem: '壬', branch: '亥', hiddenStems: [{ stem: '壬', isMain: true }] },
} })
const assessment = { strengthLevel: 'strong', structureClarity: 'clear', patternType: 'regular', climateAdjustment: { required: false }, ruleVersion: 'test' }
const layer = (key, stem, branch) => ({ key, stem, branch, label: key, ganZhi: `${stem}${branch}` })
function run(contexts, natal = chart(), modify = value => value) {
  const structure = modify(analyzeRegularStructure(natal, assessment))
  return analyzeStructureTransits({ chart: natal, structure, contexts })
}
describe('cumulative structural transit activation', () => {
  it('canonicalizes layers and compares day with its background, not with natal alone', () => {
    const input = [layer('day', '己', '未'), layer('year', '丁', '巳'), layer('month', '癸', '子'), layer('luck', '戊', '戌')]
    const result = run(input)
    expect(result.layers.map(item => item.key)).toEqual(['luck', 'year', 'month', 'day'])
    for (let i = 1; i < result.layers.length; i++) expect(result.layers[i].beforeStatus).toBe(result.layers[i - 1].afterStatus)
    expect(run([...input].reverse())).toEqual(result)
    const previous = result.layers[2].resolution.supports.find(item => item.god === '正财')
    const current = result.day.resolution.supports.find(item => item.god === '正财')
    const delta = result.day.strengthChanges.find(item => item.god === '正财')
    expect(current.index - previous.index).toBeCloseTo(delta.delta)
    expect(result.day.changes.some(item => item.direction === 'support')).toBe(true)
  })
  it('detects a newly arriving threat, including branch-hidden threats', () => {
    const result = run([layer('day', '丁', '午')])
    expect(result.day.changes.some(item => item.god === '伤官' && item.direction === 'caution')).toBe(true)
    const hidden = run([layer('day', '甲', '午')])
    expect(hidden.day.additions.some(item => item.god === '伤官' && item.kind === 'hidden')).toBe(true)
    expect(hidden.day.resolution.conflicts.find(item => item.god === '伤官').status).toBe('latent')
  })
  it('keeps earlier snapshots unchanged when a later layer makes branch contacts', () => {
    const year = layer('year', '戊', '辰'), month = layer('month', '乙', '卯')
    const a = run([year, layer('day', '己', '未')])
    const b = run([year, month, layer('day', '己', '未')])
    expect(a.layers[0]).toEqual(b.layers[0])
    expect(b.layers[1].contacts.some(item => item.pillars.includes('transit-year'))).toBe(true)
  })
  it('does not duplicate branch mass and recomputes gods relative to natal DM', () => {
    const result = run([layer('day', '壬', '申')])
    expect(result.day.god).toBe('偏印')
    expect(result.day.additions.filter(item => item.kind === 'hidden').reduce((sum, item) => sum + item.mass, 0)).toBeCloseTo(1)
    expect(new Set(result.day.changes.map(item => item.id)).size).toBe(result.day.changes.length)
  })
  it('does not resolve an ambiguous structure or balance conflict with an arriving god', () => {
    expect(run([layer('day', '戊', '辰')], chart(), value => ({ ...value, status: 'unresolved' })).status).toBe('unresolved')
    const result = run([layer('day', '戊', '辰')], chart(), value => ({ ...value, useful: { ...value.useful, helperCandidates: value.useful.helperCandidates.map(item => ({ ...item, conflict: true })) } }))
    expect(result.status).toBe('unresolved')
  })
  it('validates missing, duplicate and malformed transit layers', () => {
    expect(() => run([])).toThrow()
    expect(() => run([layer('day', '甲', '子'), layer('day', '甲', '子')])).toThrow()
    expect(() => run([layer('day', '?', '子')])).toThrow()
    expect(() => run([layer('day', '甲', '?')])).toThrow()
  })
  it('opens a conditional rescue via a transit and detects when a later layer obstructs it', () => {
    // Symbolic premises isolated from calendar validity: latent 癸, exposed/rooted
    // 辛 and 丁. The weak-DM route proposes 印. Weights are experimental only.
    const natal = chart()
    natal.pillars = {
      year: { stem: '甲', branch: '寅', hiddenStems: [{ stem: '癸', isMain: true }] },
      month: { stem: '丁', branch: '申', hiddenStems: [{ stem: '辛', isMain: true }] },
      day: { stem: '甲', branch: '辰', hiddenStems: [{ stem: '丁', isMain: true }] },
      hour: { stem: '辛', branch: '申', hiddenStems: [{ stem: '辛', isMain: true }] },
    }
    const structure = analyzeRegularStructure(natal, { ...assessment, strengthLevel: 'weak' })
    const opened = analyzeStructureTransits({ chart: natal, structure, contexts: [layer('day', '癸', '子')] })
    expect(opened.day.changes.some(item => item.id === 'day-transit-rescue-伤官-正印')).toBe(true)
    expect(opened.status).toBe('supportive')
    const closed = analyzeStructureTransits({ chart: natal, structure, contexts: [layer('year', '癸', '子'), layer('day', '戊', '午')] })
    expect(closed.day.changes.some(item => item.id === 'day-transit-lost-rescue-伤官-正印')).toBe(true)
    expect(['mixed', 'caution']).toContain(closed.status)
    expect(structure.resolution.conflicts[0].rescues[0].status).not.toBe('conditional-route')
  })
  it('preserves natal objects and delivers date-specific evidence to all five questions', () => {
    const natal = chart(), structure = analyzeRegularStructure(natal, assessment)
    const before = JSON.stringify([natal, structure])
    analyzeStructureTransits({ chart: natal, structure, contexts: [layer('day', '戊', '辰')] })
    expect(JSON.stringify([natal, structure])).toBe(before)
    const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
    const a = buildSingleLoveReadings({ input, date: '2026-10-25' }), b = buildSingleLoveReadings({ input, date: '2026-10-26' })
    expect(a.structure).toEqual(b.structure)
    expect(a.transits.background).toEqual(b.transits.background)
    expect(a.transits.day.text).not.toBe(b.transits.day.text)
    for (const reading of a.readings) {
      expect(reading.transits).toBe(a.transits)
      expect(reading.summary).toContain(a.transits.summary)
      for (const id of reading.counterSignalIds) expect(reading.evidence.some(item => item.id === id)).toBe(true)
    }
    expect(a.readings[4].status).toBe('uncertain')
  })
})
