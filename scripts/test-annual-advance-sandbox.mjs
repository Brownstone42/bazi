// Real Stripe TEST invoices + local payment handler + real synthetic DB rows.
// Does not claim hosted Checkout / LINE or deployed webhook end-to-end coverage.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { billingConfig, stripeClient, processBillingEvent } from '../netlify/lib/billing.mjs'
import { createSupabaseRest } from '../netlify/functions/line-session.mjs'
const config = billingConfig()
assert.equal(config.origin, 'https://bz-bazi.netlify.app')
assert.equal(process.env.SUPABASE_URL, 'https://ysdzzfobxrwhhqlpjluu.supabase.co')
const stripe = stripeClient(config)
const rest = createSupabaseRest({ supabaseUrl: process.env.SUPABASE_URL, secretKey: process.env.SUPABASE_SECRET_KEY })
await rest('user_entitlements?select=next_membership&limit=0')
const userId = randomUUID()
const subscriptions = []
const insert = (table, body) => rest(table, { method: 'POST', body, prefer: 'return=representation' })
const ent = async () => (await rest(`user_entitlements?user_id=eq.${userId}&select=*`))[0]
const reserve = product => rest('rpc/reserve_billing_order_v2', { method: 'POST', body: { p_user_id: userId, p_product: product, p_payment_method: 'card' } })
const processInvoice = id => processBillingEvent({ livemode: false, type: 'invoice.paid', data: { object: { id } } }, { stripe, rest, config })
try {
  const customer = await stripe.customers.create({ name: 'SYNTHETIC annual advance TEST', metadata: { bazi_test_run: userId } })
  assert.equal(customer.livemode, false)
  await insert('app_users', { id: userId, line_user_id: 'synthetic-annual-advance-' + userId, display_name: 'SYNTHETIC ANNUAL ADVANCE TEST' })
  await insert('user_entitlements', { user_id: userId, included_comparison_used: 3, purchased_comparison_credits: 5 })
  await insert('billing_customers', { user_id: userId, stripe_customer_id: customer.id })
  const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id })
  const monthlyOrder = await reserve('monthly')
  const monthly = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: config.prices.monthly }], default_payment_method: pm.id, metadata: { order_id: monthlyOrder.id, bazi_test_run: userId } })
  subscriptions.push(monthly.id)
  await processInvoice(monthly.latest_invoice)
  const before = await ent()
  assert.equal(before.billing_cycle, 'monthly')
  const annualOrder = await reserve('yearly')
  assert.equal(annualOrder.replaces_subscription_id, monthly.id)
  assert.equal(Date.parse(annualOrder.advance_starts_at), Date.parse(before.premium_expires_at))
  const upfront = await stripe.products.create({ name: 'TEST prepaid annual year', metadata: { annual_advance_order: annualOrder.id, bazi_test_run: userId } })
  const annual = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: config.prices.yearly }],
    default_payment_method: pm.id, trial_end: Math.floor(Date.parse(annualOrder.advance_expires_at) / 1000),
    add_invoice_items: [{ price_data: { currency: 'thb', unit_amount: 99900, product: upfront.id }, quantity: 1 }],
    metadata: { order_id: annualOrder.id, annual_advance: 'true', bazi_test_run: userId } })
  subscriptions.push(annual.id)
  const invoice = await stripe.invoices.retrieve(annual.latest_invoice)
  assert.equal(invoice.status, 'paid')
  assert.equal(invoice.amount_paid, 99900)
  await processInvoice(invoice.id)
  const queued = await ent()
  assert.equal(queued.billing_cycle, 'monthly')
  assert.equal(queued.premium_expires_at, before.premium_expires_at)
  assert.equal(Date.parse(queued.next_membership.startsAt), Date.parse(before.premium_expires_at))
  const canceledMonthly = await stripe.subscriptions.retrieve(monthly.id)
  assert.equal(canceledMonthly.cancel_at, Math.floor(Date.parse(before.premium_expires_at) / 1000))
  assert.equal((await processInvoice(invoice.id)).duplicate, true)
  assert.deepEqual((await ent()).next_membership, queued.next_membership)
  await assert.rejects(() => reserve('yearly'), /annual_already_queued/)
  const unchanged = await rest('rpc/activate_annual_membership', { method: 'POST', body: { p_user_id: userId } })
  assert.equal(unchanged.billing_cycle, 'monthly')
  // Move ONLY this synthetic fixture's queue start to exercise activation now.
  await rest(`user_entitlements?user_id=eq.${userId}`, { method: 'PATCH', body: { next_membership: { ...queued.next_membership, startsAt: new Date(Date.now() - 1000).toISOString() } } })
  const activated = await rest('rpc/activate_annual_membership', { method: 'POST', body: { p_user_id: userId } })
  assert.equal(activated.billing_cycle, 'yearly')
  assert.equal(activated.next_membership, null)
  assert.equal(activated.included_comparison_used, 3)
  assert.equal(activated.purchased_comparison_credits, 5)
  assert.equal(Date.parse(activated.premium_expires_at), Date.parse(annualOrder.advance_expires_at))
  console.log(JSON.stringify({ testOnly: true, actualPaidAnnualInvoice: true, monthlyCanceledAtOriginalExpiry: true, queuedNotImmediate: true, duplicateSafe: true, activationAndQuotaVerified: true, syntheticUserId: userId, hostedCheckoutTested: false }))
} finally {
  for (const id of subscriptions) {
    const sub = await stripe.subscriptions.retrieve(id)
    assert.equal(sub.livemode, false)
    assert.equal(sub.metadata.bazi_test_run, userId)
    if (sub.status !== 'canceled') await stripe.subscriptions.cancel(id, { prorate: false, invoice_now: false })
  }
  const [user] = await rest(`app_users?id=eq.${userId}&select=line_user_id`)
  if (user) {
    assert.equal(user.line_user_id, 'synthetic-annual-advance-' + userId)
    await rest(`user_entitlements?user_id=eq.${userId}`, { method: 'PATCH', body: { plan_id: 'free', premium_expires_at: '2020-01-01T00:00:00Z', next_membership: null } })
  }
}
