// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { billingConfig, checkoutParameters, processBillingEvent, products, validatePrice } from '../../netlify/lib/billing.mjs'
import { billingRequest, trustedBillingUrl } from './billing-api'
import webhook from '../../netlify/functions/stripe-webhook.mjs'

const config = { prices: { monthly: 'price_month', yearly: 'price_year', comparison: 'price_credits' } }
const env = { BILLING_TEST_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_example', BILLING_RETURN_ORIGIN: 'https://example.com', STRIPE_PRICE_MONTHLY: 'price_month', STRIPE_PRICE_YEARLY: 'price_year', STRIPE_PRICE_COMPARISON: 'price_credits', STRIPE_WEBHOOK_SECRET: 'whsec_example' }
const paymentEvent = { id: 'evt_1', livemode: false, type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', mode: 'payment' } } }
function creditFixture() {
  const session = { id: 'cs_test_1', livemode: false, payment_status: 'paid', currency: 'thb', amount_total: 5900, customer: 'cus_1', metadata: { order_id: 'order_1' }, line_items: { has_more: false, data: [{ quantity: 1, price: { id: 'price_credits' } }] } }
  return { session, stripe: { checkout: { sessions: { retrieve: vi.fn(async () => session) } } }, rest: vi.fn(async () => ({ applied: true })), config }
}
function invoiceFixture() {
  const invoice = { id: 'in_1', livemode: false, status: 'paid', currency: 'thb', amount_paid: 99900, billing_reason: 'subscription_cycle', customer: 'cus_1', parent: { subscription_details: { subscription: 'sub_1' } }, lines: { has_more: false, data: [{ quantity: 1, pricing: { price_details: { price: 'price_year' } }, period: { end: 1850000000 } }] } }
  const subscription = { id: 'sub_1', livemode: false, customer: 'cus_1', metadata: { order_id: 'order_year' }, items: { data: [{ quantity: 1, price: { id: 'price_year' } }] } }
  return { invoice, subscription, stripe: { invoices: { retrieve: vi.fn(async () => invoice) }, subscriptions: { retrieve: vi.fn(async () => subscription) } }, rest: vi.fn(async () => ({ applied: true })), config }
}
describe('Stripe test billing', () => {
  it('refuses live keys, disabled mode and untrusted return origins', () => {
    expect(billingConfig(env).origin).toBe('https://example.com')
    expect(() => billingConfig({ ...env, STRIPE_SECRET_KEY: 'sk_live_example' })).toThrow()
    expect(() => billingConfig({ ...env, BILLING_TEST_ENABLED: 'false' })).toThrow()
    expect(() => billingConfig({ ...env, BILLING_RETURN_ORIGIN: 'http://evil.example' })).toThrow()
  })
  it('validates fixed prices and intervals server-side', () => {
    const price = { active: true, livemode: false, currency: 'thb', unit_amount: 14900, recurring: { interval: 'month', interval_count: 1 } }
    expect(() => validatePrice(price, products.monthly)).not.toThrow()
    expect(() => validatePrice({ ...price, unit_amount: 1 }, products.monthly)).toThrow()
    expect(() => validatePrice(price, products.yearly)).toThrow()
    expect(() => validatePrice({ ...price, livemode: true }, products.monthly)).toThrow()
  })
  it('creates recurring and one-time sessions with durable order identity', () => {
    const args = { order: { id: 'order_1', product: 'monthly', created_at: '2026-09-28T05:00:00Z' }, customerId: 'cus_1', priceId: 'price_month', origin: 'https://example.com' }
    const monthly = checkoutParameters(args)
    expect(monthly.mode).toBe('subscription')
    expect(monthly.subscription_data.metadata.order_id).toBe('order_1')
    expect(monthly.payment_method_types).toEqual(['card'])
    expect(monthly.expires_at).toBe(Date.parse(args.order.created_at) / 1000 + 3600)
    const credits = checkoutParameters({ ...args, order: { ...args.order, product: 'comparison' } })
    expect(credits.mode).toBe('payment')
    expect(credits.subscription_data).toBeUndefined()
  })
  it('grants credits only for a retrieved paid session at the correct amount', async () => {
    const fixture = creditFixture()
    await processBillingEvent(paymentEvent, fixture)
    expect(fixture.rest).toHaveBeenCalledWith('rpc/apply_billing_payment', expect.objectContaining({ body: expect.objectContaining({ p_payment_id: 'cs_test_1', p_product: 'comparison', p_amount: 5900 }) }))
  })
  it('does not grant unpaid, live or mismatched payments', async () => {
    const fixture = creditFixture()
    fixture.session.payment_status = 'unpaid'
    await processBillingEvent(paymentEvent, fixture)
    expect(fixture.rest).not.toHaveBeenCalled()
    fixture.session.payment_status = 'paid'
    fixture.session.amount_total = 1
    await expect(processBillingEvent(paymentEvent, fixture)).rejects.toThrow('invalid_payment')
    await expect(processBillingEvent({ ...paymentEvent, livemode: true }, fixture)).rejects.toThrow()
    expect(fixture.rest).not.toHaveBeenCalled()
  })
  it('grants annual access using the paid invoice period, not the current subscription period', async () => {
    const fixture = invoiceFixture()
    await processBillingEvent({ ...paymentEvent, type: 'invoice.paid', data: { object: { id: 'in_1' } } }, fixture)
    expect(fixture.rest).toHaveBeenCalledWith('rpc/apply_billing_payment', expect.objectContaining({ body: expect.objectContaining({ p_payment_id: 'in_1', p_product: 'yearly', p_paid_until: new Date(1850000000 * 1000).toISOString() }) }))
  })
  it('rejects an invoice from a different customer or with a wrong price', async () => {
    const fixture = invoiceFixture()
    const event = { ...paymentEvent, type: 'invoice.paid', data: { object: { id: 'in_1' } } }
    fixture.invoice.customer = 'cus_other'
    await expect(processBillingEvent(event, fixture)).rejects.toThrow()
    fixture.invoice.customer = 'cus_1'
    fixture.invoice.lines.data[0].pricing.price_details.price = 'price_other'
    await expect(processBillingEvent(event, fixture)).rejects.toThrow()
    expect(fixture.rest).not.toHaveBeenCalled()
  })
  it('does not grant from subscription checkout, failed invoices or cancellations', async () => {
    const fixture = creditFixture()
    for (const type of ['invoice.payment_failed', 'customer.subscription.deleted', 'customer.subscription.updated']) await processBillingEvent({ ...paymentEvent, type }, fixture)
    await processBillingEvent({ ...paymentEvent, data: { object: { mode: 'subscription' } } }, fixture)
    expect(fixture.rest).not.toHaveBeenCalled()
  })
  it('reuses the same payment identity for retries and propagates DB failure for webhook retry', async () => {
    const fixture = creditFixture()
    await processBillingEvent(paymentEvent, fixture)
    await processBillingEvent({ ...paymentEvent, id: 'evt_retry' }, fixture)
    expect(fixture.rest.mock.calls[0][1].body).toEqual(fixture.rest.mock.calls[1][1].body)
    fixture.rest.mockRejectedValueOnce(new Error('DB unavailable'))
    await expect(processBillingEvent(paymentEvent, fixture)).rejects.toThrow('DB unavailable')
  })
  it('rejects forged and stale webhook signatures without reaching the database', async () => {
    Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value))
    try {
      const result = await webhook(new Request('https://example.com/api/stripe-webhook', { method: 'POST', body: JSON.stringify(paymentEvent), headers: { 'stripe-signature': 'forged' } }))
      expect(result.status).toBe(400)
      const stripe = new Stripe(env.STRIPE_SECRET_KEY)
      const payload = JSON.stringify(paymentEvent)
      const header = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET, timestamp: 1 })
      const stale = await webhook(new Request('https://example.com/api/stripe-webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } }))
      expect(stale.status).toBe(400)
    } finally { vi.unstubAllEnvs() }
  })
  it('requires LINE login and sends product IDs, never caller-supplied prices', async () => {
    await expect(billingRequest({ action: 'checkout' })).rejects.toThrow()
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ url: 'https://checkout.stripe.com/test' }) }))
    await billingRequest({ idToken: 'token', action: 'checkout', product: 'yearly', amount: 1, fetchImpl })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ idToken: 'token', action: 'checkout', product: 'yearly' })
    expect(() => trustedBillingUrl('https://checkout.stripe.com.evil.example')).toThrow()
    expect(() => trustedBillingUrl('javascript:alert(1)')).toThrow()
    expect(trustedBillingUrl('https://billing.stripe.com/test')).toBe('https://billing.stripe.com/test')
  })
})

