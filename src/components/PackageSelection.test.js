import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PackageSelection from './PackageSelection.vue'
describe('separate membership packages', () => {
  const props = { planId: 'premium', billingCycle: 'monthly', expiresAt: '2099-01-01T00:00:00Z' }
  it.each([
    [{}, 'Free'],
    [props, 'Premium รายเดือน'],
    [{ ...props, billingCycle: 'yearly' }, 'Premium รายปี'],
    [{ ...props, expiresAt: '2020-01-01T00:00:00Z' }, 'Free']
  ])('places the current package above the plan heading without duplicating it', (membership, title) => {
    const wrapper = mount(PackageSelection, { props: membership, slots: { heading: '<h2 class="plan-heading">CHOOSE YOUR PLAN</h2>' } })
    const current = wrapper.get('.current-package')
    expect(current.findAll('.package')).toHaveLength(1)
    expect(current.text()).toContain(title)
    expect(current.text()).toContain('แพ็กเกจปัจจุบัน')
    expect(current.element.nextElementSibling).toBe(wrapper.get('.plan-heading').element)
    expect(wrapper.findAll('.package')).toHaveLength(4)
  })
  it('marks only the purchased monthly package as current, not Free or annual', () => {
    const wrapper = mount(PackageSelection, { props: { ...props, paymentMethod: 'card' } })
    expect(wrapper.findAll('.current')).toHaveLength(1)
    expect(wrapper.get('.current').text()).toContain('Premium รายเดือน')
    expect(wrapper.get('.free').text()).not.toContain('แพ็กเกจปัจจุบัน')
    expect(wrapper.get('.current button').element.disabled).toBe(true)
  })
  it('allows monthly PromptPay extensions and an advance annual purchase while monthly is active', async () => {
    const wrapper = mount(PackageSelection, { props: { ...props, paymentMethod: 'promptpay' } })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].text()).toContain('ขยายวันหมดอายุ')
    expect(buttons[0].element.disabled).toBe(false)
    expect(buttons[1].element.disabled).toBe(false)
    expect(buttons[1].text()).toContain('ซื้อรายปีล่วงหน้า')
    expect(buttons[2].element.disabled).toBe(false)
    await buttons[0].trigger('click')
    expect(wrapper.emitted('select')).toEqual([['monthly']])
  })
  it('blocks further membership purchases once an annual package is queued, without blocking credits', () => {
    const wrapper = mount(PackageSelection, { props: { ...props, nextMembership: { startsAt: props.expiresAt } } })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].element.disabled).toBe(true)
    expect(buttons[1].element.disabled).toBe(true)
    expect(buttons[1].text()).toContain('ซื้อรายปีล่วงหน้าแล้ว')
    expect(buttons[2].element.disabled).toBe(false)
  })
  it('offers both packages after expiry and shows annual quota separately', () => {
    const wrapper = mount(PackageSelection, { props: { ...props, expiresAt: '2020-01-01T00:00:00Z' } })
    expect(wrapper.findAll('.current')).toHaveLength(0)
    expect(wrapper.findAll('button').every(b => !b.element.disabled)).toBe(true)
    expect(wrapper.text()).toContain('10 คน / เดือน')
    expect(wrapper.text()).toContain('ล่วงหน้า 90 วัน')
  })
})
