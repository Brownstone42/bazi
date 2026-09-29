import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BillingPanel from './BillingPanel.vue'
import { billingRequest } from '../services/billing-api'
vi.mock('../services/billing-api', () => ({ billingRequest: vi.fn(), trustedBillingUrl: vi.fn(value => value) }))
beforeEach(() => vi.clearAllMocks())
describe('billing panel', () => {
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
    expect(wrapper.text()).toContain('ต่ออายุอัตโนมัติ')
    expect(wrapper.emitted('refresh-account')).toHaveLength(1)
  })
  it('reports unavailable billing without displaying a false success', async () => {
    billingRequest.mockRejectedValue(new Error('ระบบชำระเงินทดสอบยังตั้งค่าไม่ครบ'))
    const wrapper = mount(BillingPanel, { props: { idToken: 'token', product: 'monthly' } })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('ยังตั้งค่าไม่ครบ')
    expect(wrapper.emitted('refresh-account')).toBeUndefined()
  })
})

