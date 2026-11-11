import { describe, expect, it } from 'vitest'
import { analyzeRegularStructure, evaluateStructureTransit } from './regular-structure.js'
import { calculateChart } from './bazi.js'

// Synthetic rule fixtures intentionally isolate premises; not claimed birth charts.
const hidden = (stem, element, isMain = true) => ({ stem, element, isMain })
const fixture = () => ({ dayMaster: { char: '甲', element: 'wood' }, interactions: [], pillars: {
  year: { stem: '戊', branch: '辰', hiddenStems: [hidden('戊', 'earth')] },
  month: { stem: '辛', branch: '酉', hiddenStems: [hidden('辛', 'metal')] },
  day: { stem: '甲', branch: '寅', hiddenStems: [hidden('甲', 'wood')] },
  hour: { stem: '壬', branch: '亥', hiddenStems: [hidden('壬', 'water')] },
} })
const assessment = (strengthLevel = 'strong') => ({ strengthLevel, structureClarity: 'clear', patternType: 'regular', climateAdjustment: { required: false }, ruleVersion: 'test-isolated-strength' })
const transit = (stem, god) => ({ key: 'day', label: 'วันจร', stem, god, ganZhi: `${stem}子` })

describe('bounded regular structures and separate useful-god channels', () => {
  it('selects a rooted exposed month stem and keeps structure focus separate from helpers', () => {
    const result = analyzeRegularStructure(fixture(), assessment())
    expect(result.status).toBe('candidate')
    expect(result.selected.god).toBe('正官')
    expect(result.selected.exposedAt).toEqual(['month'])
    expect(result.selected.rootsAt).toEqual(['month'])
    expect(result.useful.monthFocus).toBe('正官')
    expect(result.useful.helperCandidates.map(item => item.god)).toEqual(['正财', '偏财'])
    expect(result.useful.status).toBe('conditional')
  })
  it('changes the same transit interpretation when natal capacity changes', () => {
    const strong = analyzeRegularStructure(fixture(), assessment('strong'))
    const weak = analyzeRegularStructure(fixture(), assessment('weak'))
    expect(evaluateStructureTransit(strong, transit('癸', '正印')).status).toBe('neutral')
    expect(evaluateStructureTransit(weak, transit('癸', '正印')).status).toBe('supportive')
    // Output helps balance a strong DM but 伤官 challenges the officer structure.
    expect(evaluateStructureTransit(strong, transit('丁', '伤官')).status).toBe('mixed')
  })
  it('retains multiple exposed candidates instead of declaring a winner', () => {
    const chart = fixture()
    chart.pillars.month.hiddenStems.push(hidden('戊', 'earth', false))
    const result = analyzeRegularStructure(chart, assessment())
    expect(result.candidates).toHaveLength(2)
    expect(result.selected).toBe(null)
    expect(result.useful.status).toBe('unresolved')
  })
  it.each(['possible_follow', 'possible_dominant'])('does not use normal helpers for %s', patternType => {
    const result = analyzeRegularStructure(fixture(), { ...assessment(), patternType })
    expect(result.useful.helperCandidates).toEqual([])
    expect(result.status).toBe('unresolved')
  })
  it('defers peer months, storage months, transformations and uncertain strength', () => {
    const peerChart = fixture()
    peerChart.pillars.month = { stem: '甲', branch: '寅', hiddenStems: [hidden('甲', 'wood')] }
    expect(analyzeRegularStructure(peerChart, assessment()).status).toBe('unresolved')
    const storage = fixture(); storage.pillars.month.branch = '丑'
    expect(analyzeRegularStructure(storage, assessment()).status).toBe('unresolved')
    const transformation = fixture(); transformation.interactions = [{ type: 'TRINE', pillars: ['year', 'month', 'hour'] }]
    expect(analyzeRegularStructure(transformation, assessment()).status).toBe('unresolved')
    const borderline = analyzeRegularStructure(fixture(), { ...assessment(), structureClarity: 'borderline' })
    expect(evaluateStructureTransit(borderline, transit('戊', '偏财')).status).toBe('unresolved')
  })
  it('records a stem binding or existing structural tension rather than announcing success', () => {
    const bound = fixture(); bound.pillars.hour.stem = '丙'
    expect(analyzeRegularStructure(bound, assessment()).useful.blockers.join()).toContain('ประสาน')
    const damaged = fixture(); damaged.pillars.hour.stem = '丁'
    expect(analyzeRegularStructure(damaged, assessment()).useful.blockers.join()).toContain('伤官')
  })
  it('keeps a climate hint separate and cannot treat missing coverage as normal climate', () => {
    const result = analyzeRegularStructure(fixture(), { ...assessment(), climateAdjustment: { required: true, preferredElement: 'fire' } })
    expect(result.climate.status).toBe('limited-signal')
    expect(result.useful.helperCandidates.map(item => item.element)).toEqual(['earth', 'earth'])
    expect(analyzeRegularStructure(fixture(), assessment()).climate.status).toBe('not-assessed')
  })
  it('accepts actual engine charts deterministically without mutating them', () => {
    const chart = calculateChart({ birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' })
    const original = JSON.stringify(chart)
    const result = analyzeRegularStructure(chart)
    expect(result).toEqual(analyzeRegularStructure(chart))
    expect(JSON.stringify(chart)).toBe(original)
    expect(result.evidence.length).toBeGreaterThan(2)
  })
})
