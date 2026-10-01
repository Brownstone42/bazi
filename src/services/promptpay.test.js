// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { checkoutParameters, processBillingEvent, products } from '../../netlify/lib/billing.mjs'
import { billingRequest } from './billing-api'
const event = { livemode: false, type: 'checkout.session.completed', data: { object: { mode: 'payment', id: 'cs_test_pp' } } }
function fixture(product = 'monthly') {
  const session = { id: 'cs_test_pp', livemode: false, payment_status: 'paid', customer: 'cus_pp', client_reference_id: 'order_pp', currency: 'thb', amount_total: products[product].amount,
    metadata: { order_id: 'order_pp', product, payment_method: 'promptpay' },
    line_items: { has_more: false, data: [{ quantity: 1, price: { currency: 'thb', unit_amount: products[product].amount } }] },
    payment_intent: { livemode: false, status: 'succeeded', currency: 'thb', amount_received: products[product].amount, customer: 'cus_pp', metadata: { order_id: 'order_pp' }, payment_method: { type: 'promptpay' } } }
  return { session, stripe: { checkout: { sessions: { retrieve: vi.fn(async () => session) } } }, rest: vi.fn(async () => ({ applied: true })), config: { prices: {} } }
}
describe('one-time PromptPay', () => {
  it.each(['monthly', 'yearly', 'comparison'])('uses fixed one-time amount for %s, never recurring price', product => {
    const args = checkoutParameters({ order: { id: 'order_pp', product, payment_method: 'promptpay', created_at: new Date().toISOString() }, customerId: 'cus_pp', origin: 'https://example.com' })
    expect(args.mode).toBe('payment')
    expect(args.payment_method_types).toEqual(['promptpay'])
    expect(args.line_items[0].price_data.unit_amount).toBe(products[product].amount)
    expect(args.subscription_data).toBeUndefined()
    expect(args.payment_intent_data.metadata).toMatchObject({ order_id: 'order_pp', product, payment_method: 'promptpay' })
  })
  it.each(['monthly', 'yearly', 'comparison'])('grants %s only after re-fetching paid PromptPay proof', async product => {
    const f = fixture(product)
    await processBillingEvent(event, f)
    expect(f.rest).toHaveBeenCalledWith('rpc/apply_promptpay_payment', expect.objectContaining({ body: { p_payment_id: 'cs_test_pp', p_order_id: 'order_pp', p_customer_id: 'cus_pp', p_product: product, p_amount: products[product].amount } }))
  })
  it('ignores unpaid completion and uses identical session identity for async payment / retries', async () => {
    const f = fixture()
    f.session.payment_status = 'unpaid'
    expect(await processBillingEvent(event, f)).toEqual({ ignored: true })
    expect(f.rest).not.toHaveBeenCalled()
    f.session.payment_status = 'paid'
    await processBillingEvent({ ...event, type: 'checkout.session.async_payment_succeeded' }, f)
    await processBillingEvent(event, f)
    expect(f.rest.mock.calls[0]).toEqual(f.rest.mock.calls[1])
  })
  it.each(['amount', 'method', 'customer', 'intent', 'order', 'quantity'])('rejects incorrect %s proof', async field => {
    const f = fixture()
    if (field === 'amount') f.session.payment_intent.amount_received = 1
    if (field === 'method') f.session.payment_intent.payment_method.type = 'card'
    if (field === 'customer') f.session.payment_intent.customer = 'cus_other'
    if (field === 'intent') f.session.payment_intent.status = 'processing'
    if (field === 'order') f.session.client_reference_id = 'other_order'
    if (field === 'quantity') f.session.line_items.data[0].quantity = 2
    await expect(processBillingEvent(event, f)).rejects.toThrow('invalid_promptpay_payment')
    expect(f.rest).not.toHaveBeenCalled()
  })
  it('sends payment method but ignores caller-supplied prices', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    await billingRequest({ idToken: 'token', action: 'checkout', product: 'monthly', paymentMethod: 'promptpay', amount: 1, fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ idToken: 'token', action: 'checkout', product: 'monthly', paymentMethod: 'promptpay' })
  })
})
