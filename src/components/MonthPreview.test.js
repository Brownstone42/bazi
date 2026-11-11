import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MonthPreview from './MonthPreview.vue'
import { calculateChart } from '../services/bazi.js'
import { assessDayMasterStrength } from '../services/strength-engine.js'
import { buildPersonalMonth } from '../services/personal-calendar.js'
import { presentMonth } from '../services/month-preview.js'

const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
const chart = calculateChart(input)
const assessment = assessDayMasterStrength(chart)
const props = { input, chart, assessment, today: '2026-11-02' }

describe('experimental month page', () => {
  it('keeps daily scores, counts every date, and splits solar months from the engine', () => {
    const month = buildPersonalMonth({ ...props, year: 2026, month: 11 })
    const view = presentMonth(month, chart, props.today)
    expect(view.days.map(day => day.personalScore)).toEqual(month.days.map(day => day.personalScore))
    expect(view.counts.reduce((sum, item) => sum + item.count, 0)).toBe(30)
    expect(view.leadingBlanks).toBe(0) // Nov 1 is Sunday.
    expect(view.segments).toHaveLength(2)
    expect(view.segments[0].end + 1).toBe(view.segments[1].start)
    expect(view.days.filter(day => day.festival).map(day => day.day)).toEqual([9, 23])
    expect([...view.highlights, ...view.caution].every(day => day.key >= props.today)).toBe(true)
    expect(view.highlights.every(day => day.personalScore > 60 && !day.reason.startsWith('clash-'))).toBe(true)
    expect(view.best.every(day => day.personalScore > 60 && !day.reason.startsWith('clash-'))).toBe(true)
    expect(view.best.every((day, index) => !index || day.day === view.best[index - 1].day + 1)).toBe(true)
  })
  it('navigates across years and opens the exact selected day', async () => {
    const wrapper = mount(MonthPreview, { props: { ...props, today: '2026-12-02' } })
    await wrapper.get('button[aria-label="เดือนถัดไป"]').trigger('click')
    expect(wrapper.get('.month-switch h3').text()).toContain('2570')
    expect(wrapper.findAll('.month-calendar button')).toHaveLength(31)
    await wrapper.get('.month-calendar button').trigger('click')
    expect(wrapper.emitted('day')[0]).toEqual(['2027-01-01'])
    await wrapper.get('button[aria-label="เดือนก่อน"]').trigger('click')
    expect(wrapper.get('.month-switch h3').text()).toContain('ธันวาคม')
    wrapper.unmount()
  })
  it('handles leap February and missing birth data', () => {
    const wrapper = mount(MonthPreview, { props: { ...props, today: '2028-02-01' } })
    expect(wrapper.findAll('.month-calendar button')).toHaveLength(29)
    expect(wrapper.findAll('.month-calendar > span')).toHaveLength(9) // weekdays + Sunday/Monday blanks.
    wrapper.unmount()
    const empty = mount(MonthPreview, { props: { today: props.today } })
    expect(empty.find('.month-calendar').exists()).toBe(false)
    expect(empty.get('[role="status"]').text()).toContain('กรุณาระบุ')
    empty.unmount()
  })
})
