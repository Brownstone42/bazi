import { describe, it, expect } from 'vitest'
import { buildQimenDirections, dailyWealthDirection, palaceDirections } from './qimen-directions.js'
import { mergeBestHours, guideSymbols } from './daily-guide.js'

describe('experimental Chaibu directions', () => {
  it('matches a hand-worked yin-five Jia-Shen chart at the xun head', () => {
    // Frost descent, upper yuan => yin 5. Geng at 3; Jia-Shen hides Geng.
    // Xun elapsed=0 => doors at home; deity Chief at 3, backwards on ring.
    const chart = buildQimenDirections('2026-11-02', '15:30')
    expect(chart).toMatchObject({ ju: 5, dun: 'หยิน', hourPillar: '甲申', authority: 'ตะวันออก', work: 'ตะวันตกเฉียงเหนือ', rest: 'เหนือ', avoid: 'ตะวันตกเฉียงใต้' })
    expect(chart.deities).toEqual({ 值符: 3, 騰蛇: 8, 太陰: 1, 六合: 6, 白虎: 7, 玄武: 2, 九地: 9, 九天: 4 })
    // One hour branch later: Yi at 6, chief door from 3 down to 2.
    const next = buildQimenDirections('2026-11-02', '17:30')
    expect(next.hourPillar).toBe('乙酉')
    expect(next.authority).toBe('ตะวันตกเฉียงเหนือ')
    expect(next.doors['傷']).toBe(2)
  })
  it('uses exact solar-term instant in Bangkok, not the whole calendar date', () => {
    // 2026 Li Dong = 17:52:05 UTC+8 = 16:52:05 Bangkok.
    expect(buildQimenDirections('2026-11-07', '16:52').term).toBe('霜降')
    expect(buildQimenDirections('2026-11-07', '16:53').term).toBe('立冬')
  })
  it('keeps Zi across midnight and changes pillars at 23:00', () => {
    const late = buildQimenDirections('2026-11-02', '23:30')
    const next = buildQimenDirections('2026-11-03', '00:30')
    expect(late.hourPillar).not.toBe(buildQimenDirections('2026-11-02', '22:59').hourPillar)
    expect(late.doors).toEqual(next.doors)
    expect(late.deities).toEqual(next.deities)
  })
  it('has exactly eight unique outer palaces in both seasons including central lodgings', () => {
    for (const date of ['2026-01-03', '2026-06-22', '2026-11-02']) for (let h = 0; h < 24; h++) {
      const chart = buildQimenDirections(date, `${String(h).padStart(2, '0')}:30`)
      for (const plate of [chart.doors, chart.deities]) {
        expect(new Set(Object.values(plate)).size).toBe(8)
        expect(Object.values(plate).every(p => palaceDirections[p])).toBe(true)
      }
    }
    expect(dailyWealthDirection('2026-11-02')).toBe('ตะวันออก')
  })
  it('merges adjacent best periods but preserves gaps and never mutates input', () => {
    const hours = [{ start: 15, end: 17, score: 80 }, { start: 17, end: 19, score: 80 }, { start: 19, end: 21, score: 60 }, { start: 21, end: 23, score: 80 }]
    expect(mergeBestHours(hours)).toEqual(['15:00–18:59', '21:00–22:59'])
    expect(hours[0].end).toBe(17)
    expect(mergeBestHours([{ start: 0, end: 1, score: 60 }])).toEqual([])
  })
  it('omits unresolved elements and keeps HeTu numbers separate', () => {
    expect(guideSymbols({ primaryUsefulElement: 'wood', cautionElements: [] }, null).numbers).toEqual([3, 8])
    expect(guideSymbols({ primaryUsefulElement: 'wood', cautionElements: ['wood'] }, null).numbers).toEqual([])
    expect(guideSymbols({ primaryUsefulElement: 'wood', elementAssessments: { wood: { status: 'unresolved' } } }, null).options).toEqual([])
  })
})
