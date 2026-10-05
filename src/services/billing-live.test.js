// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { billingConfig, processBillingEvent, validatePrice, products } from '../../netlify/lib/billing.mjs'
import { accountSchema } from '../../netlify/lib/billing-mode.mjs'
import { createSupabaseRest, readAccount } from '../../netlify/functions/line-session.mjs'

const live = { BILLING_MODE: 'live', BILLING_LIVE_ENABLED: 'true', BILLING_LIVE_SCHEMA_READY: 'true',
  BILLING_RETURN_ORIGIN: 'https://bz-bazi.netlify.app', STRIPE_SECRET_KEY: 'rk_live_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example', STRIPE_PRICE_MONTHLY: 'price_month',
  STRIPE_PRICE_YEARLY: 'price_year', STRIPE_PRICE_COMPARISON: 'price_credits' }
describe('Live billing isolation', () => {
  it('starts independent account reads together but still waits for authoritative entitlement refresh', async () => {
    const pending = []
    const rest = vi.fn(path => new Promise(resolve => pending.push(() => resolve(path === 'rpc/refresh_account_entitlement' ? { plan_id: 'premium' } : []))))
    rest.schema = 'bazi_live'
    const reading = readAccount(rest, 'user_live')
    expect(rest).toHaveBeenCalledTimes(3)
    for (const resolve of pending) resolve()
    expect((await reading).entitlement.plan_id).toBe('premium')
  })
  it('requires explicit activation, migration acknowledgement and matching key mode', () => {
    expect(billingConfig(live).livemode).toBe(true)
    for (const overrides of [{ BILLING_LIVE_ENABLED: 'false' }, { BILLING_LIVE_SCHEMA_READY: 'false' },
      { STRIPE_SECRET_KEY: 'sk_test_x' }, { STRIPE_WEBHOOK_SECRET: '' },
      { BILLING_RETURN_ORIGIN: 'http://localhost:5173' }, { BILLING_MODE: 'invalid' }]) {
      expect(() => billingConfig({ ...live, ...overrides })).toThrow()
    }
    expect(billingConfig({ ...live, STRIPE_SECRET_KEY: 'sk_live_x' }).livemode).toBe(true)
  })
  it('never falls back to Sandbox data for Live accounts', async () => {
    expect(accountSchema(live)).toBe('bazi_live')
    expect(accountSchema({})).toBe('public')
    const fetcher = vi.fn(async () => new Response('[]', { status: 200 }))
    const rest = createSupabaseRest({ supabaseUrl: 'https://example.supabase.co', secretKey: 'sb_secret_x', schema: 'bazi_live' }, fetcher)
    await rest('user_entitlements?select=*')
    await rest('rpc/apply_billing_payment', { method: 'POST', body: {} })
    for (const [, options] of fetcher.mock.calls) {
      expect(options.headers['Accept-Profile']).toBe('bazi_live')
      expect(options.headers['Content-Profile']).toBe('bazi_live')
    }
  })
  it('validates Live prices and refuses Sandbox prices', () => {
    const price = { livemode: true, active: true, currency: 'thb', unit_amount: 14900, recurring: { interval: 'month', interval_count: 1 } }
    expect(() => validatePrice(price, products.monthly, billingConfig(live))).not.toThrow()
    expect(() => validatePrice({ ...price, livemode: false }, products.monthly, billingConfig(live))).toThrow()
  })
  it('uses the atomic Live account refresh without a stale PATCH', async () => {
    const rest = vi.fn(async path => path === 'rpc/refresh_account_entitlement' ? { plan_id: 'free' } : [])
    rest.schema = 'bazi_live'
    const account = await readAccount(rest, 'user_live')
    expect(account.entitlement.plan_id).toBe('free')
    expect(rest.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false)
  })
  it('accepts a paid Live subscription invoice and rejects a Sandbox subscription', async () => {
    const config = billingConfig(live)
    const event = { livemode: true, type: 'invoice.paid', data: { object: { id: 'in_live' } } }
    const invoice = { livemode: true, id: 'in_live', status: 'paid', currency: 'thb', amount_paid: 14900,
      billing_reason: 'subscription_cycle', customer: 'cus_live', parent: { subscription_details: { subscription: 'sub_live' } },
      lines: { has_more: false, data: [{ quantity: 1, pricing: { price_details: { price: 'price_month' } }, period: { end: 1900000000 } }] } }
    const subscription = { livemode: true, id: 'sub_live', customer: 'cus_live', metadata: { order_id: 'live_order' },
      items: { data: [{ quantity: 1, price: { id: 'price_month' } }] } }
    const stripe = { invoices: { retrieve: async () => invoice }, subscriptions: { retrieve: async () => subscription } }
    const rest = vi.fn(async () => ({ applied: true }))
    await processBillingEvent(event, { config, rest, stripe })
    expect(rest).toHaveBeenCalledTimes(1)
    subscription.livemode = false
    await expect(processBillingEvent(event, { config, rest, stripe })).rejects.toThrow()
  })
  it('grants only paid Live credits and rejects cross-mode events or fetched objects', async () => {
    const config = billingConfig(live)
    const event = { livemode: true, type: 'checkout.session.completed', data: { object: { id: 'cs_live_1', mode: 'payment' } } }
    const session = { id: 'cs_live_1', livemode: true, payment_status: 'paid', currency: 'thb', amount_total: 5900,
      customer: 'cus_live', metadata: { order_id: 'live_order' },
      line_items: { has_more: false, data: [{ quantity: 1, price: { id: 'price_credits' } }] } }
    const rest = vi.fn(async () => ({ applied: true }))
    const stripe = { checkout: { sessions: { retrieve: vi.fn(async () => session) } } }
    await processBillingEvent(event, { config, rest, stripe })
    expect(rest).toHaveBeenCalledTimes(1)
    rest.mockClear()
    await expect(processBillingEvent({ ...event, livemode: false }, { config, rest, stripe })).rejects.toThrow()
    session.livemode = false
    await expect(processBillingEvent(event, { config, rest, stripe })).rejects.toThrow()
    expect(rest).not.toHaveBeenCalled()
  })
})
