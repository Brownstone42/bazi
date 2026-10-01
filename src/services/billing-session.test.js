// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rest: vi.fn(), create: vi.fn(), prices: vi.fn(), subscriptions: vi.fn() }))
vi.mock('../../netlify/functions/line-session.mjs', () => ({
  requiredEnvironment: () => ({ channelId: 'channel' }),
  verifyLineIdToken: async () => ({ sub: 'line-test' }),
  createSupabaseRest: () => mocks.rest
}))
vi.mock('../../netlify/lib/billing.mjs', async importOriginal => ({
  ...await importOriginal(),
  billingConfig: () => ({ origin: 'https://example.com', prices: { monthly: 'price_monthly', yearly: 'price_yearly' } }),
  stripeClient: () => ({ subscriptions: { list: mocks.subscriptions }, prices: { retrieve: mocks.prices }, checkout: { sessions: { create: mocks.create } } })
}))
import handler from '../../netlify/functions/billing-session.mjs'
let entitlement
const request = (product, paymentMethod) => handler(new Request('https://example.com/api/billing-session', { method: 'POST', body: JSON.stringify({ action: 'checkout', idToken: 'token', product, paymentMethod }) }))
beforeEach(() => {
  vi.clearAllMocks()
  entitlement = { plan_id: 'free' }
  mocks.subscriptions.mockResolvedValue({ data: [], has_more: false })
  mocks.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
  mocks.rest.mockImplementation(async (path, options) => {
    if (path.startsWith('app_users?')) return [{ id: 'user_test' }]
    if (path.startsWith('billing_customers?')) return [{ stripe_customer_id: 'cus_test' }]
    if (path.startsWith('user_entitlements?')) return [entitlement]
    if (path === 'rpc/reserve_billing_order_v2') return { id: 'order_test', product: options.body.p_product, payment_method: options.body.p_payment_method, created_at: new Date().toISOString(), ...(options.body.p_product === 'yearly' && entitlement.billing_cycle === 'monthly' ? { advance_starts_at: entitlement.premium_expires_at, advance_expires_at: '2100-01-01T00:00:00Z' } : {}) }
    throw new Error('Unexpected path')
  })
})
describe('PromptPay checkout ownership and package guards', () => {
  it('reserves a method-aware order and creates one-time checkout, not a recurring price', async () => {
    expect((await request('monthly', 'promptpay')).status).toBe(200)
    expect(mocks.rest).toHaveBeenCalledWith('rpc/reserve_billing_order_v2', expect.objectContaining({ body: { p_user_id: 'user_test', p_product: 'monthly', p_payment_method: 'promptpay' } }))
    expect(mocks.prices).not.toHaveBeenCalled()
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ mode: 'payment', payment_method_types: ['promptpay'], customer: 'cus_test' })
  })
  it('allows same-cycle extension and prepaid annual upgrade, but blocks monthly card switch', async () => {
    entitlement = { plan_id: 'premium', billing_cycle: 'monthly', billing_payment_method: 'promptpay', premium_expires_at: '2099-01-01T00:00:00Z' }
    expect((await request('yearly', 'promptpay')).status).toBe(200)
    mocks.create.mockClear()
    expect((await request('monthly', 'card')).status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
    expect((await request('monthly', 'promptpay')).status).toBe(200)
  })
  it('allows annual advance when only the existing monthly card subscription is active', async () => {
    entitlement = { plan_id: 'premium', billing_cycle: 'monthly', billing_payment_method: 'card', premium_expires_at: '2099-01-01T00:00:00Z' }
    mocks.subscriptions.mockResolvedValue({ data: [{ status: 'active', items: { data: [{ price: { id: 'price_monthly' } }] } }], has_more: false })
    expect((await request('yearly', 'promptpay')).status).toBe(200)
    expect(mocks.create.mock.calls[0][0].metadata.annual_advance).toBe('true')
  })
  it('blocks a second membership purchase once annual has been paid and queued', async () => {
    entitlement = { plan_id: 'premium', billing_cycle: 'monthly', next_membership: { startsAt: '2099-01-01T00:00:00Z' } }
    expect((await request('yearly', 'promptpay')).status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('blocks PromptPay while an existing card subscription is active, but permits extra credits', async () => {
    mocks.subscriptions.mockResolvedValue({ data: [{ status: 'active' }], has_more: false })
    expect((await request('monthly', 'promptpay')).status).toBe(409)
    expect((await request('comparison', 'promptpay')).status).toBe(200)
  })
  it('rejects unknown methods and inherited product names before creating sessions', async () => {
    expect((await request('monthly', 'truemoney')).status).toBe(400)
    expect((await request('toString', 'promptpay')).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
