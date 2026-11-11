import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Identity60 from './Identity60.vue'

describe('identity60 gallery', () => {
  it('renders all original illustrations, marks the selected day, and filters', async () => {
    const wrapper = mount(Identity60, { props: { chart: { pillars: { day: { stem: '戊', branch: '午' } } } } })
    expect(wrapper.findAll('.identity60-row')).toHaveLength(60)
    expect(wrapper.findAll('.identity60-row svg')).toHaveLength(60)
    expect(wrapper.get('.identity60-own').text()).toContain('戊午')
    expect(wrapper.get('.is-own').text()).toContain('ฐานหินใต้แสงอุ่น')
    expect(wrapper.findAll('.identity60-row[open]')).toHaveLength(0)
    expect(wrapper.get('.is-own').findAll('.identity60-content section')).toHaveLength(7)
    await wrapper.get('select').setValue('wood')
    expect(wrapper.findAll('.identity60-row')).toHaveLength(12)
    await wrapper.get('select').setValue('all')
    await wrapper.get('input').setValue('癸亥')
    expect(wrapper.findAll('.identity60-row')).toHaveLength(1)
    expect(wrapper.get('.identity60-row').text()).toContain('หมอกน้ำเหนืออ่าวเงียบ')
    await wrapper.get('input').setValue('ไม่พบแน่นอน')
    expect(wrapper.get('[role=status]').text()).toContain('ไม่พบตัวตน')
    wrapper.unmount()
  })
  it('permits browsing without manufacturing a personal result', () => {
    const wrapper = mount(Identity60)
    expect(wrapper.find('.identity60-own').exists()).toBe(false)
    expect(wrapper.findAll('.identity60-row')).toHaveLength(60)
    expect(wrapper.text()).toContain('ไม่สมมติเวลาเกิด')
    wrapper.unmount()
  })
})
