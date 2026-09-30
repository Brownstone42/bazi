// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import syncAccount from '../../netlify/functions/line-session.mjs'
import { processBillingEvent, subscriptionStatus } from '../../netlify/lib/billing.mjs'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

// Exercise the real account handler with only the network/database replaced.
// This does not assert real Stripe delivery or execution of the SQL payment RPC.
function accountFixture(cycle = 'monthly') {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T08:00:00Z'))
  vi.stubEnv('LINE_CHANNEL_ID', 'test-channel')
  vi.stubEnv('SUPABASE_URL', 'https://db.example')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test-only')
  const entitlement = { plan_id: 'premium', billing_cycle: cycle, premium_expires_at: '2026-10-29T08:00:00Z', comparison_period_start: '2026-10-01', included_comparison_used: 3, purchased_comparison_credits: 5, free_comparison_used: true }
  const profile = { birth_date: '1989-08-26', profile_version: 1 }
  const reports = [{ id: 'saved-report', person_name: 'Test person', birth_date: '1992-04-02', owner_profile_version: 1, result_json: { score: 61 } }]
  const patches = []
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (String(url).startsWith('https://api.line.me/')) return Response.json({ sub: 'test-user', aud: 'test-channel' })
    const path = new URL(url).pathname
    if (path.endsWith('/app_users')) return Response.json([{ id: 'test-user', display_name: 'Test' }])
    if (path.endsWith('/user_entitlements')) {
      if (options.method === 'POST') return new Response(null, { status: 204 })
      if (options.method === 'PATCH') { const update = JSON.parse(options.body); patches.push(update); Object.assign(entitlement, update) }
      return Response.json([entitlement])
    }
    if (path.endsWith('/birth_profiles')) return Response.json([profile])
    if (path.endsWith('/comparison_reports')) return Response.json(reports)
    throw new Error('Unexpected test endpoint: ' + path)
  }))
  return { entitlement, patches, async sync() {
    const response = await syncAccount(new Request('https://app.example/api/line-session', { method: 'POST', body: JSON.stringify({ action: 'sync', idToken: 'test-token' }) }))
    expect(response.status).toBe(200)
    return response.json()
  } }
}

describe('subscription lifecycle with simulated application time', () => {
  it.each(['monthly', 'yearly'])('retains paid %s access before expiry and preserves data at expiry', async cycle => {
    const fixture = accountFixture(cycle)
    vi.setSystemTime(new Date('2026-10-29T07:59:59Z'))
    const before = await fixture.sync()
    expect(before.entitlement.planId).toBe('premium')
    expect(fixture.patches).toHaveLength(0)
    vi.setSystemTime(new Date('2026-10-29T08:00:00Z'))
    const expired = await fixture.sync()
    expect(expired.entitlement).toMatchObject({ planId: 'free', purchasedComparisonCredits: 5, includedComparisonUsed: 1, premiumExpiresAt: null })
    expect(expired.birthProfile).toEqual(before.birthProfile)
    expect(expired.comparisonReports).toEqual(before.comparisonReports)
    expect(fixture.patches[0]).not.toHaveProperty('purchased_comparison_credits')
    await fixture.sync()
    expect(fixture.patches).toHaveLength(1)
  })

  it.each(['monthly', 'yearly'])('resets %s quota on the Bangkok month boundary without erasing credits', async cycle => {
    const fixture = accountFixture(cycle)
    fixture.entitlement.premium_expires_at = '2026-12-29T08:00:00Z'
    vi.setSystemTime(new Date('2026-10-31T16:59:59Z'))
    expect((await fixture.sync()).entitlement.includedComparisonUsed).toBe(3)
    vi.setSystemTime(new Date('2026-10-31T17:00:00Z'))
    expect((await fixture.sync()).entitlement).toMatchObject({ planId: 'premium', billingCycle: cycle, includedComparisonUsed: 0, purchasedComparisonCredits: 5 })
    expect(fixture.entitlement.comparison_period_start).toBe('2026-11-01')
    await fixture.sync()
    expect(fixture.patches).toHaveLength(1)
  })

  it('requests extension from a paid renewal invoice, not a subscription period or browser return', async () => {
    const rest = vi.fn()
    const invoice = { id: 'in_renewal', status: 'paid', livemode: false, customer: 'cus_test', currency: 'thb', billing_reason: 'subscription_cycle', amount_paid: 14900, parent: { subscription_details: { subscription: 'sub_test' } }, lines: { has_more: false, data: [{ quantity: 1, pricing: { price_details: { price: 'price_month' } }, period: { end: 1795939200 } }] } }
    const subscription = { livemode: false, id: 'sub_test', customer: 'cus_test', metadata: { order_id: 'order_test' }, items: { data: [{ quantity: 1, price: 'price_month', current_period_end: 1800000000 }] } }
    const stripe = { invoices: { retrieve: vi.fn(async () => invoice) }, subscriptions: { retrieve: vi.fn(async () => subscription) } }
    const event = { livemode: false, type: 'invoice.paid', data: { object: { id: 'in_renewal' } } }
    await processBillingEvent(event, { stripe, rest, config: { prices: { monthly: 'price_month' } } })
    expect(rest).toHaveBeenCalledWith('rpc/apply_billing_payment', { method: 'POST', body: expect.objectContaining({ p_payment_id: 'in_renewal', p_product: 'monthly', p_amount: 14900, p_paid_until: new Date(1795939200000).toISOString() }) })
  })

  it.each(['invoice.payment_failed', 'customer.subscription.updated', 'customer.subscription.deleted'])('%s never extends paid access; expiry still returns Free', async type => {
    const fixture = accountFixture()
    const rest = vi.fn()
    await processBillingEvent({ livemode: false, type, data: { object: { id: 'test-event-object' } } }, { rest, stripe: {}, config: {} })
    expect(rest).not.toHaveBeenCalled()
    expect((await fixture.sync()).entitlement).toMatchObject({ planId: 'free', purchasedComparisonCredits: 5 })
  })

  it('distinguishes a scheduled cancellation from ended and renewed subscriptions', () => {
    const subscription = { status: 'active', cancel_at_period_end: false, cancel_at: 1793260800 }
    expect(subscriptionStatus(subscription).renewalCanceled).toBe(true)
    expect(subscriptionStatus({ ...subscription, status: 'canceled' }).status).toBe('canceled')
    expect(subscriptionStatus({ ...subscription, cancel_at: null }).renewalCanceled).toBe(false)
  })
})
