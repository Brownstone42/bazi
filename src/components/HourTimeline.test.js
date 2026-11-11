import { it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HourTimeline from './HourTimeline.vue'
import { calculateChart } from '../services/bazi.js'
import { assessDayMasterStrength } from '../services/strength-engine.js'

it('selects hours on the arc by click and keyboard without showing numeric scores', async () => {
  const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
  const chart = calculateChart(input)
  const wrapper = mount(HourTimeline, { props: { input, chart, assessment: assessDayMasterStrength(chart), date: '2026-11-02', today: '2026-11-03' } })
  const segments = wrapper.findAll('.hour-segment')
  expect(segments).toHaveLength(13)
  await segments[4].trigger('click')
  expect(segments[4].attributes('aria-pressed')).toBe('true')
  expect(wrapper.get('.hour-center').text()).toContain('07:00–08:59')
  expect(wrapper.emitted('select-time').at(-1)[0]).toEqual({ date: '2026-11-02', time: '07:30', label: '07:00–08:59' })
  await segments[5].trigger('keydown', { key: 'Enter' })
  expect(wrapper.get('.hour-center').text()).toContain('09:00–10:59')
  expect(wrapper.find('.hour-buttons').exists()).toBe(false)
  expect(wrapper.text()).not.toMatch(/คะแนน|\/100/)
  wrapper.unmount()
})
