import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import BaziQuestions from './BaziQuestions.vue'
import * as loveReadings from '../services/single-love.js'
const input = { birthDate: '26/08/1989', birthTime: '11:30', gender: 'male', timezoneId: 'Asia/Bangkok' }
async function submit(wrapper) {
  await wrapper.get('form').trigger('submit')
  await new Promise(resolve => setTimeout(resolve, 10))
  await flushPromises()
}
describe('question tab local UI', () => {
  it('hides the score panel when no signed factors exist', async () => {
    const reading = vi.spyOn(loveReadings, 'buildSingleLoveReadings').mockReturnValue({ readings: [{
      topic: 'love-overview', date: '2026-10-12', topicLabel: 'วันนี้ความรักเป็นอย่างไร?',
      presentation: { headline: 'ค่อย ๆ ทำความรู้จักกัน' }, score: { value: null, factors: [] },
    }] })
    const wrapper = mount(BaziQuestions, { props: { input } })
    try {
      await submit(wrapper)
      expect(wrapper.get('.plain-answer').text()).toBe('ค่อย ๆ ทำความรู้จักกัน')
      expect(wrapper.find('.score-details').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('ประเมินคะแนนไม่ได้')
    } finally { wrapper.unmount(); reading.mockRestore() }
  })
  it('shows a reading on demand, exposes evidence, and clears stale results when inputs change', async () => {
    const network = vi.spyOn(globalThis, 'fetch')
    const wrapper = mount(BaziQuestions, { props: { input } })
    try {
      expect(wrapper.find('.question-result').exists()).toBe(false)
      await wrapper.get('input[type=date]').setValue('2026-10-12')
      await submit(wrapper)
      expect(wrapper.find('.question-result').exists()).toBe(true)
      expect(wrapper.get('.score-details').element.tagName).toBe('DETAILS')
      expect(wrapper.get('.score-details').attributes('open')).toBeUndefined()
      expect(wrapper.get('.plain-answer').element.children).toHaveLength(1)
      expect(wrapper.get('.plain-answer').text()).not.toMatch(/用神|สิบเทพ|ก้านซ่อน|วังคู่ครอง/)
      wrapper.get('.score-details').element.open = true
      expect(wrapper.find('.ten-god-item').exists()).toBe(false)
      expect(wrapper.find('.calculation-details').exists()).toBe(false)
      expect(wrapper.get('.score-details').text()).toContain('เกณฑ์ทดลอง')
      expect(wrapper.find('.score-factors p').exists()).toBe(false)
      expect(wrapper.get('.score-details').text()).not.toContain('ประเมินคะแนนไม่ได้')
      expect(wrapper.get('select').findAll('option')).toHaveLength(5)
      await wrapper.get('select').setValue('love-attraction')
      expect(wrapper.find('.question-result').exists()).toBe(false)
      await submit(wrapper)
      expect(wrapper.get('.question-result').text()).toContain('วันนี้จะเจอคนที่ถูกใจมั้ย?')
      expect(wrapper.get('.score-details').attributes('open')).toBeUndefined()
      expect(network).not.toHaveBeenCalled()
    } finally { wrapper.unmount(); network.mockRestore() }
  })
  it('finds dates separately and opens the same evidence without recomputing a calendar', async () => {
    const wrapper = mount(BaziQuestions, { props: { input } })
    try {
      await wrapper.findAll('.question-modes button')[1].trigger('click')
      const fields = wrapper.findAll('input[type=date]')
      await fields[0].setValue('2026-10-12')
      await fields[1].setValue('2026-10-15')
      await submit(wrapper)
      expect(wrapper.findAll('.question-date-results button')).toHaveLength(3)
      await wrapper.findAll('.question-date-results button')[0].trigger('click')
      expect(wrapper.find('.question-result').exists()).toBe(true)
      expect(wrapper.find('.calculation-details').exists()).toBe(false)
      await wrapper.setProps({ input: { ...input, birthTime: '12:30' } })
      expect(wrapper.find('.question-result').exists()).toBe(false)
      expect(wrapper.find('.question-date-results').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })
  it('shows validation errors rather than a reading when a range exceeds the limit', async () => {
    const wrapper = mount(BaziQuestions, { props: { input } })
    try {
      await wrapper.findAll('.question-modes button')[1].trigger('click')
      const fields = wrapper.findAll('input[type=date]')
      await fields[0].setValue('2026-10-01')
      await fields[1].setValue('2026-11-01')
      await submit(wrapper)
      expect(wrapper.get('[role=alert]').text()).toContain('31 วัน')
      expect(wrapper.find('.question-result').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })
})
