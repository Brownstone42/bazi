import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import BillingPanel from './BillingPanel.vue'
import { billingRequest } from '../services/billing-api'
vi.mock('../services/billing-api', () => ({ billingRequest: vi.fn(), trustedBillingUrl: vi.fn(value => value) }))
beforeEach(() => vi.clearAllMocks())
enableAutoUnmount(afterEach)
describe('billing panel', () => {
  it('shows canceled renewal for an active subscription with only cancel_at set', async () => {
    billingRequest.mockResolvedValue({ enabled: true, payments: [], subscriptions: [{ status: 'active', cancelAtPeriodEnd: false, cancelAt: 1793206800, renewalCanceled: true, periodEnd: 1793206800 }] })
    const wrapper = mount(BillingPanel, { props: { idToken: 'token' } })
    await flushPromises()
    expect(wrapper.get('.renewal-off').text()).toContain('ยกเลิกต่ออายุแล้ว')
    expect(wrapper.text()).toContain('ยังใช้ Premium ได้ถึง')
    expect(wrapper.text()).not.toContain('เปิดต่ออายุอัตโนมัติ')
  })
  it('refreshes cancellation after returning from Stripe and removes listeners on unmount', async () => {
    const active = { enabled: true, payments: [], hasCustomer: true, subscriptions: [{ status: 'active', cancelAtPeriodEnd: false, periodEnd: 1793206800 }] }
    billingRequest.mockResolvedValueOnce(active)
    const wrapper = mount(BillingPanel, { props: { idToken: 'token' } })
    await flushPromises()
    expect(wrapper.text()).toContain('เปิดต่ออายุอัตโนมัติ')
    const canceled = { ...active, subscriptions: [{ ...active.subscriptions[0], cancelAtPeriodEnd: true }] }
    billingRequest.mockResolvedValue(canceled)
    window.dispatchEvent(new Event('focus'))
    await flushPromises()
    expect(wrapper.get('.renewal-off').text()).toContain('ยกเลิกต่ออายุแล้ว')
    expect(wrapper.text()).toContain('ยังใช้ Premium ได้ถึง')
    expect(wrapper.text()).not.toContain('เปิดต่ออายุอัตโนมัติ')
    expect(wrapper.emitted('refresh-account').at(-1)).toEqual([canceled])
    wrapper.unmount()
    billingRequest.mockClear()
    window.dispatchEvent(new Event('focus'))
    expect(billingRequest).not.toHaveBeenCalled()
  })
  it('does not promise continued access for an ended subscription', async () => {
    billingRequest.mockResolvedValue({ enabled: true, payments: [], subscriptions: [{ status: 'canceled', cancelAtPeriodEnd: true }] })
    const wrapper = mount(BillingPanel, { props: { idToken: 'token' } })
    await flushPromises()
    expect(wrapper.find('.renewal-off').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('ยังใช้ Premium ได้ถึง')
  })
  it('never opens Checkout automatically for the local mock or a return URL', async () => {
    const wrapper = mount(BillingPanel, { props: { local: true, product: 'yearly' } })
    await flushPromises()
    expect(billingRequest).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('ยังจ่ายผ่าน Stripe ไม่ได้')
    expect(wrapper.text()).not.toContain('ไปชำระเงินทดสอบบน Stripe')
  })
  it('requires an explicit payment click and shows recurring consent', async () => {
    billingRequest.mockResolvedValue({ enabled: true, payments: [], subscriptions: [], hasCustomer: false })
    const wrapper = mount(BillingPanel, { props: { idToken: 'token', product: 'yearly' } })
    await flushPromises()
    expect(billingRequest).toHaveBeenCalledTimes(1)
    expect(billingRequest).toHaveBeenCalledWith({ idToken: 'token', action: 'status' })
    expect(wrapper.text()).toContain('999 บาท/ปี')
    expect(wrapper.get('.pay-button').text()).toContain('QR PromptPay')
    await wrapper.findAll('.method')[1].trigger('click')
    expect(wrapper.text()).toContain('ต่ออายุอัตโนมัติ')
    expect(wrapper.emitted('refresh-account')).toHaveLength(1)
  })
  it('reports unavailable billing without displaying a false success', async () => {
    billingRequest.mockRejectedValue(new Error('ระบบชำระเงินทดสอบยังตั้งค่าไม่ครบ'))
    const wrapper = mount(BillingPanel, { props: { idToken: 'token', product: 'monthly' } })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('ยังตั้งค่าไม่ครบ')
    expect(wrapper.emitted('refresh-account')).toEqual([[null]])
  })
})
