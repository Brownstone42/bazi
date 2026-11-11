import { it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import LovePreview from './LovePreview.vue'
import { calculateChart } from '../services/bazi.js'
import { assessDayMasterStrength } from '../services/strength-engine.js'
it('renders reactive chart props and lets users switch status and month',async()=>{
  const input={birthDate:'26/08/1989',birthTime:'11:30',gender:'male',timezoneId:'Asia/Bangkok'}
  const chart=calculateChart(input)
  const wrapper=mount(LovePreview,{props:{input:reactive(input),chart:reactive(chart),assessment:assessDayMasterStrength(chart),relationshipStatus:'talking'}})
  await new Promise(resolve=>setTimeout(resolve,80))
  expect(wrapper.findAll('.love-bars button')).toHaveLength(22)
  expect(wrapper.findAll('.status-options button')).toHaveLength(2)
  expect(wrapper.text()).not.toContain('ซับซ้อน')
  expect(wrapper.text()).toContain('คู่บุญ')
  expect(wrapper.text()).toContain('น้ำหยิน · ปีมะแม')
  await wrapper.findAll('.status-options button')[0].trigger('click')
  expect(wrapper.findAll('.status-options button')[0].attributes('aria-pressed')).toBe('true')
  await wrapper.findAll('.love-bars button')[1].trigger('click')
  expect(wrapper.findAll('.love-bars button')[1].attributes('aria-pressed')).toBe('true')
  wrapper.unmount()
})
