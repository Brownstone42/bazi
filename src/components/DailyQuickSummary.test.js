import { it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DailyQuickSummary from './DailyQuickSummary.vue'
import { calculateChart } from '../services/bazi.js'
import { assessDayMasterStrength } from '../services/strength-engine.js'

it('updates both direction groups from the selected hour without changing daily wealth', async () => {
  const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
  const chart = calculateChart(input)
  const wrapper = mount(DailyQuickSummary, { props: { input, chart, assessment: assessDayMasterStrength(chart), date: '2026-11-02', selectedHour: { date: '2026-11-02', time: '15:30', label: '15:00–16:59' } } })
  expect(wrapper.get('.direction-group').text()).toContain('15:00–16:59')
  expect(wrapper.get('.direction-group .quick-columns strong').text()).toBe('ตะวันออก')
  const beforeTravel = wrapper.findAll('.direction-group')[1].text()
  const daily = wrapper.get('.quick-columns').text()
  await wrapper.setProps({ selectedHour: { date: '2026-11-02', time: '17:30', label: '17:00–18:59' } })
  expect(wrapper.get('.direction-group .quick-columns strong').text()).toBe('ตะวันตกเฉียงเหนือ')
  expect(wrapper.findAll('.direction-group')[1].text()).not.toBe(beforeTravel)
  expect(wrapper.get('.quick-columns').text()).toBe(daily)
  expect(wrapper.find('details').exists()).toBe(false)
  wrapper.unmount()
})
