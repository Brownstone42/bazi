import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TodayPreview from './TodayPreview.vue'
import { calculateChart } from '../services/bazi.js'
import { assessDayMasterStrength } from '../services/strength-engine.js'
import { buildPersonalMonth } from '../services/personal-calendar.js'

describe('local today page', () => {
  afterEach(() => vi.useRealTimers())
  it('keeps missing birth data out of scored readings', () => {
    const wrapper = mount(TodayPreview)
    expect(wrapper.get('[role="status"]').text()).toContain('กรุณาระบุ')
    expect(wrapper.find('.today-gauge').exists()).toBe(false)
    wrapper.unmount()
  })
  it('uses existing engine scores, changes dates across months, and discloses only nonzero factors', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-31T05:00:00Z'))
    const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
    const chart = calculateChart(input)
    const assessment = assessDayMasterStrength(chart)
    const wrapper = mount(TodayPreview, { props: { input, chart, assessment } })
    const expected = buildPersonalMonth({ input, chart, assessment, year: 2026, month: 10 }).days[30]
    expect(wrapper.get('.today-gauge').attributes('aria-label')).toContain(`${expected.personalScore} จาก 100`)
    expect(wrapper.findAll('.today-topic')).toHaveLength(4)
    expect(wrapper.findAll('.today-factor')).toHaveLength(0)
    expect(wrapper.findAll('.today-topic').every(item => item.element.tagName === 'ARTICLE')).toBe(true)
    await wrapper.get('button[aria-label="2026-11-01"]').trigger('click')
    expect(wrapper.get('button[aria-label="2026-11-01"]').attributes('aria-pressed')).toBe('true')
    const next = buildPersonalMonth({ input, chart, assessment, year: 2026, month: 11 }).days[0]
    expect(wrapper.get('.today-gauge').attributes('aria-label')).toContain(`${next.personalScore} จาก 100`)
    await wrapper.get('#period-month').trigger('click')
    expect(wrapper.get('#period-month').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('.today-gauge').exists()).toBe(false)
    expect(wrapper.findAll('.month-calendar button')).toHaveLength(31)
    await wrapper.get('#period-year').trigger('click')
    expect(wrapper.findAll('.solar-month')).toHaveLength(12)
    await wrapper.get('.month-detail button').trigger('click')
    expect(wrapper.get('#period-month').attributes('aria-selected')).toBe('true')
    const firstDay = wrapper.get('.month-calendar button').attributes('aria-label').slice(0, 10)
    await wrapper.get('.month-calendar button').trigger('click')
    expect(wrapper.get('#period-day').attributes('aria-selected')).toBe('true')
    expect(wrapper.get(`button[aria-label="${firstDay}"]`).attributes('aria-pressed')).toBe('true')
    wrapper.unmount()
  })
})
