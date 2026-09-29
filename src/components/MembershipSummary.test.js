import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MembershipSummary from './MembershipSummary.vue'

const now = new Date('2026-09-28T05:00:00Z')
describe('membership summary', () => {
  it('shows annual quota separately from purchased credits', () => {
    const wrapper = mount(MembershipSummary, { props: { planId: 'premium', billingCycle: 'yearly', includedUsed: 3, purchasedCredits: 5, expiresAt: '2027-09-28T05:00:00Z', now } })
    expect(wrapper.text()).toContain('Premium รายปี')
    expect(wrapper.text()).toContain('7 / 10 คน')
    expect(wrapper.text()).toContain('ล่วงหน้า 90 วัน')
    expect(wrapper.text()).toContain('5 คน')
  })
  it('shows monthly and Free entitlements', () => {
    const monthly = mount(MembershipSummary, { props: { planId: 'premium', includedUsed: 1, now } })
    expect(monthly.text()).toContain('4 / 5 คน')
    expect(monthly.text()).toContain('ล่วงหน้า 30 วัน')
    const free = mount(MembershipSummary, { props: { now } })
    expect(free.text()).toContain('1 / 1 คน')
    expect(free.text()).toContain('เฉพาะวันนี้')
  })
  it('does not show expired Premium quota as available or erase purchased credits', () => {
    const wrapper = mount(MembershipSummary, { props: { planId: 'premium', billingCycle: 'yearly', expiresAt: now.toISOString(), purchasedCredits: 5, now } })
    expect(wrapper.text()).toContain('หมดอายุแล้ว')
    expect(wrapper.text()).toContain('เฉพาะวันนี้')
    expect(wrapper.text()).not.toContain('10 / 10')
    expect(wrapper.text()).toContain('5 คน')
  })
  it('labels the local mock and opens packages without granting access', async () => {
    const wrapper = mount(MembershipSummary, { props: { local: true, now } })
    expect(wrapper.text()).toContain('ไม่ใช่สมาชิกที่ชำระเงินจริง')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('packages')).toHaveLength(1)
  })
})
