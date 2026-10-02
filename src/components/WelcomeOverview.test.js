import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WelcomeOverview from './WelcomeOverview.vue'

describe('new visitor introduction', () => {
  it('explains the four free features without requiring a payment', () => {
    const wrapper = mount(WelcomeOverview)
    expect(wrapper.findAll('.welcome-feature')).toHaveLength(4)
    for (const label of ['อ่านฟรี', 'ฟรีทุกช่วง', 'ดูวันนี้ฟรี', 'ฟรีคนแรก', 'ไม่ต้องซื้อแพ็กเกจหรือกรอกข้อมูลบัตร', '30 วัน', '90 วัน']) {
      expect(wrapper.text()).toContain(label)
    }
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'))
  })

  it('starts the birth form without purchasing or calculating anything', async () => {
    const wrapper = mount(WelcomeOverview)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
    expect(wrapper.get('button').attributes('type')).toBe('button')
  })
})
