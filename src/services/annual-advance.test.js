// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { checkoutParameters, fulfillAnnualAdvance, processBillingEvent } from '../../netlify/lib/billing.mjs'
import { readAccount } from '../../netlify/functions/line-session.mjs'
const start = new Date(Date.now() + 30 * 86400000).toISOString()
const end = new Date(Date.now() + 395 * 86400000).toISOString()
function fixture() {
  const order = { id: 'order_advance', user_id: 'user_test', product: 'yearly', payment_method: 'promptpay', status: 'pending', created_at: new Date().toISOString(), advance_starts_at: start, advance_expires_at: end, replaces_subscription_id: 'sub_monthly' }
  const membership = { billing_cycle: 'monthly', premium_expires_at: start }
  const previous = { id: 'sub_monthly', livemode: false, customer: 'cus_test', status: 'active', items: { data: [{ price: 'price_monthly' }] } }
  const stripe = { subscriptions: { retrieve: vi.fn(async () => previous), update: vi.fn(async () => ({})), cancel: vi.fn() } }
  const rest = vi.fn(async path => {
    if (path.startsWith('billing_orders?')) return [order]
    if (path.startsWith('billing_customers?')) return [{ stripe_customer_id: 'cus_test' }]
    if (path.startsWith('user_entitlements?')) return [membership]
    if (path === 'rpc/apply_annual_advance_payment') return { applied: true }
    throw new Error('Unexpected test path')
  })
  return { order, membership, previous, stripe, rest, config: { prices: { monthly: 'price_monthly', yearly: 'price_yearly' } } }
}
const payment = { orderId: 'order_advance', customerId: 'cus_test', paymentId: 'cs_paid', amount: 99900 }
describe('prepaid annual upgrade', () => {
  it('charges upfront annual card price once and defers recurring billing to prepaid expiry', () => {
    const f = fixture()
    const parameters = checkoutParameters({ order: { ...f.order, payment_method: 'card' }, priceId: 'price_yearly', customerId: 'cus_test', origin: 'https://example.com' })
    expect(parameters.mode).toBe('subscription')
    expect(parameters.line_items).toHaveLength(2)
    expect(parameters.line_items[1].price_data.unit_amount).toBe(99900)
    expect(parameters.subscription_data.trial_end).toBe(Math.floor(Date.parse(end) / 1000))
    expect(parameters.subscription_data.metadata.annual_advance).toBe('true')
  })
  it('cancels only the verified previous monthly subscription, before storing the paid annual queue', async () => {
    const f = fixture()
    await fulfillAnnualAdvance(payment, f)
    expect(f.stripe.subscriptions.update).toHaveBeenCalledWith('sub_monthly', { cancel_at: Math.floor(Date.parse(start) / 1000), proration_behavior: 'none' }, expect.objectContaining({ idempotencyKey: 'bazi-annual-cancel-order_advance' }))
    expect(f.rest).toHaveBeenCalledWith('rpc/apply_annual_advance_payment', expect.objectContaining({ body: expect.objectContaining({ p_payment_id: 'cs_paid', p_amount: 99900, p_subscription_id: null }) }))
  })
  it('does not store a successful queue if Stripe cancellation fails, so the webhook retries', async () => {
    const f = fixture()
    f.stripe.subscriptions.update.mockRejectedValue(new Error('Stripe unavailable'))
    await expect(fulfillAnnualAdvance(payment, f)).rejects.toThrow('Stripe unavailable')
    expect(f.rest.mock.calls.some(([path]) => path === 'rpc/apply_annual_advance_payment')).toBe(false)
  })
  it.each(['customer', 'price', 'period'])('rejects mismatched %s before cancelling anything', async field => {
    const f = fixture()
    if (field === 'customer') f.previous.customer = 'cus_other'
    if (field === 'price') f.previous.items.data[0].price = 'price_yearly'
    if (field === 'period') f.membership.premium_expires_at = end
    await expect(fulfillAnnualAdvance(payment, f)).rejects.toThrow()
    expect(f.stripe.subscriptions.update).not.toHaveBeenCalled()
  })
  it('never cancels monthly on an unpaid checkout event', async () => {
    const f = fixture()
    f.stripe.checkout = { sessions: { retrieve: vi.fn(async () => ({ payment_status: 'unpaid', livemode: false })) } }
    await processBillingEvent({ livemode: false, type: 'checkout.session.completed', data: { object: { mode: 'payment', id: 'cs_unpaid' } } }, f)
    expect(f.stripe.subscriptions.update).not.toHaveBeenCalled()
    expect(f.rest).not.toHaveBeenCalled()
  })
  it('handles a paid annual card invoice with upfront and deferred recurring lines', async () => {
    const f = fixture()
    f.order.payment_method = 'card'
    const annual = { id: 'sub_yearly', livemode: false, customer: 'cus_test', metadata: { order_id: f.order.id, annual_advance: 'true' }, trial_end: Math.floor(Date.parse(end) / 1000), items: { data: [{ quantity: 1, price: 'price_yearly' }] } }
    const invoice = { id: 'in_advance', status: 'paid', livemode: false, currency: 'thb', customer: 'cus_test', amount_paid: 99900, billing_reason: 'subscription_create', parent: { subscription_details: { subscription: annual.id } }, lines: { has_more: false, data: [
      { quantity: 1, amount: 0, pricing: { price_details: { price: 'price_yearly' } } },
      { quantity: 1, amount: 99900, pricing: { price_details: { price: 'price_upfront' } } }
    ] } }
    f.stripe.invoices = { retrieve: vi.fn(async () => invoice) }
    f.stripe.prices = { retrieve: vi.fn(async () => ({ active: false, livemode: false, currency: 'thb', unit_amount: 99900 })) }
    f.stripe.subscriptions.retrieve.mockImplementation(async id => id === annual.id ? annual : f.previous)
    await processBillingEvent({ livemode: false, type: 'invoice.paid', data: { object: { id: invoice.id } } }, f)
    expect(f.rest).toHaveBeenCalledWith('rpc/apply_annual_advance_payment', expect.objectContaining({ body: expect.objectContaining({ p_payment_id: 'in_advance', p_subscription_id: 'sub_yearly', p_amount: 99900 }) }))
    expect(f.stripe.subscriptions.update).toHaveBeenCalledOnce()
  })
  it('does not activate annual or expose its quota before the start; activates before the old expiry handler at the boundary', async () => {
    const queued = { startsAt: '2026-11-01T05:00:00Z', expiresAt: '2027-11-01T05:00:00Z', paymentMethod: 'promptpay' }
    let stored = { plan_id: 'premium', billing_cycle: 'monthly', premium_expires_at: queued.startsAt, next_membership: queued, comparison_period_start: '2026-11-01', included_comparison_used: 3, purchased_comparison_credits: 5 }
    const rest = vi.fn(async (path, options) => {
      if (path === 'rpc/activate_annual_membership') { stored = { ...stored, billing_cycle: 'yearly', premium_expires_at: queued.expiresAt, next_membership: null }; return stored }
      if (path.startsWith('user_entitlements?')) { if (options?.method === 'PATCH') Object.assign(stored, options.body); return [stored] }
      if (path.startsWith('birth_profiles?') || path.startsWith('comparison_reports?')) return []
      throw new Error('Unexpected test path')
    })
    expect((await readAccount(rest, 'user_test', new Date('2026-11-01T04:59:59Z'))).entitlement.billing_cycle).toBe('monthly')
    expect(rest.mock.calls.some(([p]) => p === 'rpc/activate_annual_membership')).toBe(false)
    const activated = (await readAccount(rest, 'user_test', new Date(queued.startsAt))).entitlement
    expect(activated.billing_cycle).toBe('yearly')
    expect(activated.plan_id).toBe('premium')
    expect(activated.included_comparison_used).toBe(3)
    expect(activated.purchased_comparison_credits).toBe(5)
  })
})
