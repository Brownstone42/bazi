import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { personalStars } from './personal-stars'
import { personalDayScore, buildPersonalMonth } from './personal-calendar'
import { calculateChart } from './bazi'
import { assessDayMasterStrength } from './strength-engine'
import PersonalDayReading from '../components/PersonalDayReading.vue'

describe('personal daily calendar presentation', () => {
  it.each([
    ['寅午戌', '卯', '申'], ['巳酉丑', '午', '亥'],
    ['申子辰', '酉', '寅'], ['亥卯未', '子', '巳']
  ])('checks peach blossom and travel for every natal year in %s', (branches, peach, travel) => {
    for (const yearBranch of branches) {
      expect(personalStars('甲', peach, { yearBranch }).some(star => star.id === 'peach-blossom')).toBe(true)
      expect(personalStars('甲', travel, { yearBranch }).some(star => star.id === 'sky-horse')).toBe(true)
    }
  })
  it.each([
    ['寅卯辰', '巳', '丑'], ['巳午未', '申', '辰'],
    ['申酉戌', '亥', '未'], ['亥子丑', '寅', '戌']
  ])('groups solitude stars without duplication for %s', (branches, solitary, lonely) => {
    for (const yearBranch of branches) {
      for (const [branch, sourceStar] of [[solitary, 'solitary'], [lonely, 'loneliness']]) {
        const found = personalStars('甲', branch, { yearBranch }).filter(star => star.id === 'personal-space')
        expect(found).toHaveLength(1)
        expect(found[0].sourceStar).toBe(sourceStar)
      }
    }
  })
  it.each([['甲', '寅'], ['乙', '卯'], ['丙', '巳'], ['丁', '午'], ['戊', '巳'], ['己', '午'], ['庚', '申'], ['辛', '酉'], ['壬', '亥'], ['癸', '子']])('checks Lu Shen for %s', (stem, branch) => {
    expect(personalStars(stem, branch).some(star => star.id === 'prosperity')).toBe(true)
  })
  it('does not invent year-based stars when year is missing and rejects invalid transit branches', () => {
    expect(personalStars('甲', '卯').some(star => star.reference === 'year-branch')).toBe(false)
    expect(personalStars('甲', 'x', { yearBranch: '寅' })).toEqual([])
    expect(personalStars('甲', undefined)).toEqual([])
    const icons = new Set('子丑寅卯辰巳午未申酉戌亥'.split('').flatMap(branch => personalStars('戊', branch, { yearBranch: '巳' })).map(star => star.icon))
    expect(icons.size).toBe(6)
  })
  it('keeps the existing nobleman and intelligence tables', () => {
    expect(personalStars('戊', '丑').map(star => star.id)).toEqual(['nobleman'])
    expect(personalStars('戊', '申').map(star => star.id)).toEqual(['intelligence'])
    expect(personalStars('戊', '午')).toEqual([])
    expect(personalStars('辛', '午').map(star => star.id)).toEqual(['nobleman'])
    expect(personalStars('甲', '')).toEqual([])
  })
  it('converts the existing model to a bounded display scale without adding star points', () => {
    expect([-10, -5, 0, 5, 10].map(personalDayScore)).toEqual([0, 0, 50, 100, 100])
    const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
    const chart = calculateChart(input)
    const month = buildPersonalMonth({ chart, assessment: assessDayMasterStrength(chart), input, year: 2026, month: 9 })
    expect(month.days.some(day => day.stars.length)).toBe(true)
    for (const day of month.days) {
      expect(day.personalScore).toBeGreaterThanOrEqual(0)
      expect(day.personalScore).toBeLessThanOrEqual(100)
      expect(day.topicReadings.every(topic => topic.summary && topic.dailyAdvice)).toBe(true)
      expect(day.focus).toBe('all')
    }
  })
  it('switches score explanations without changing the day score and resets on a new date', async () => {
    const explanation = { base: 50, factors: [{ id: 'overview', label: 'ปัจจัยภาพรวม', detail: 'รายละเอียดภาพรวม', points: 12 }, { id: 'bound', label: 'การจำกัดช่วงคะแนน', points: -1, technical: true }], adjustment: 1, method: 'เกณฑ์', summary: 'เหตุผลภาพรวม' }
    const day = { key: '2026-09-01', day: 1, focus: 'all', personalScore: 62, summary: 'ภาพรวม', scoreExplanation: explanation, stars: [], topicReadings: [{ focus: 'work', focusLabel: 'งาน', personalScore: 70, scoreExplanation: { ...explanation, factors: [{ id: 'work', label: 'ปัจจัยการงาน', detail: 'รายละเอียดการงาน', points: 20 }], summary: 'เหตุผลการงาน' } }] }
    const wrapper = mount(PersonalDayReading, { props: { day, monthLabel: 'กันยายน' } })
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.find('.personal-day-advice').text()).toContain('รายละเอียดการงาน')
    expect(wrapper.find('.personal-day-advice').text()).not.toContain('เหตุผลการงาน')
    expect(wrapper.find('.personal-day-advice').text()).toContain('70')
    expect(wrapper.find('.personal-day-score').text()).toContain('62')
    await wrapper.setProps({ day: { ...day, key: '2026-09-02', day: 2 } })
    expect(wrapper.find('.personal-day-advice').text()).toContain('รายละเอียดภาพรวม')
    expect(wrapper.find('.personal-day-advice').text()).not.toMatch(/เหตุผลภาพรวม|การจำกัดช่วงคะแนน|ปรับการปัดเศษ/)
  })
})
