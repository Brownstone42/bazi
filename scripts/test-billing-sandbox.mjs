// Run with: node --env-file=.env.billing-test.local scripts/test-billing-sandbox.mjs <setup|renew|fail|expire|cancel> [monthly|yearly]
// Real Sandbox + deployed webhook + real test-only DB rows. Never accepts live keys.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { billingConfig, stripeClient, validatePrice, products, processBillingEvent } from '../netlify/lib/billing.mjs'
import { createSupabaseRest, readAccount } from '../netlify/functions/line-session.mjs'

const action = process.argv[2]
const cycle = process.argv[3] || 'monthly'
assert(['setup', 'renew', 'fail', 'verify-failure', 'expire', 'cancel'].includes(action), 'Invalid action')
assert(['monthly', 'yearly'].includes(cycle), 'Invalid cycle')
const config = billingConfig()
assert.equal(config.origin, 'https://bz-bazi.netlify.app')
assert.equal(process.env.SUPABASE_URL, 'https://ysdzzfobxrwhhqlpjluu.supabase.co')
const secretKey = process.env.SUPABASE_SECRET_KEY
assert(secretKey?.startsWith('sb_secret_') || secretKey?.startsWith('eyJ'), 'Server DB key required')
const stripe = stripeClient(config)
const rest = createSupabaseRest({ supabaseUrl: process.env.SUPABASE_URL, secretKey })
const path = new URL(`../.netlify/billing-test-${cycle}.json`, import.meta.url)
let state
const log = (step, fields = {}) => console.log(JSON.stringify({ step, cycle, ...fields }))
const save = async () => { await mkdir(new URL('../.netlify/', import.meta.url), { recursive: true }); await writeFile(path, JSON.stringify(state, null, 2)) }
const pause = () => new Promise(resolve => setTimeout(resolve, 3000))
async function until(label, fn) {
  for (let i = 0; i < 30; i++) { const result = await fn(); if (result) return result; if (i % 5 === 0) log('waiting', { for: label }); await pause() }
  throw new Error('Timeout: ' + label)
}
const insert = (table, body) => rest(table, { method: 'POST', body, prefer: 'return=representation' })
const entitlement = async () => (await rest(`user_entitlements?user_id=eq.${state.userId}&select=*`))[0]
async function guard() {
  const [user] = await rest(`app_users?id=eq.${state.userId}&select=line_user_id`)
  assert.equal(user?.line_user_id, 'sandbox-lifecycle-' + state.runId)
  const customer = await stripe.customers.retrieve(state.customerId)
  assert.equal(customer.livemode, false)
  assert.equal(customer.metadata.bazi_test_run, state.runId)
  assert.equal(customer.test_clock, state.clockId)
}
async function advance(time) {
  await stripe.testHelpers.testClocks.advance(state.clockId, { frozen_time: time })
  await until('clock ready', async () => (await stripe.testHelpers.testClocks.retrieve(state.clockId)).status === 'ready')
}
async function paidViaWebhook(invoice) {
  assert.equal(invoice.status, 'paid')
  await until('deployed webhook payment ledger', async () => (await rest(`billing_payments?id=eq.${invoice.id}&user_id=eq.${state.userId}&select=id`)).length === 1)
  const ent = await entitlement()
  assert.equal(ent.plan_id, 'premium')
  assert.equal(ent.billing_cycle, cycle)
  assert.equal(Date.parse(ent.premium_expires_at), invoice.lines.data[0].period.end * 1000)
  assert.equal(ent.purchased_comparison_credits, 5)
  assert.equal(ent.included_comparison_used, 3)
  state.paidUntil = ent.premium_expires_at
  await save()
  log('paid_webhook_verified', { invoice: invoice.id, paidUntil: state.paidUntil })
}
async function main() {
  validatePrice(await stripe.prices.retrieve(config.prices[cycle]), products[cycle])
  if (action === 'setup') {
    try { await readFile(path); throw new Error('Fixture already exists; refusing duplicate setup') } catch (e) { if (e.code !== 'ENOENT') throw e }
    state = { runId: randomUUID(), userId: randomUUID(), cycle, createdAt: new Date().toISOString() }
    await save()
    const clock = await stripe.testHelpers.testClocks.create({ frozen_time: Math.floor(Date.now() / 1000), name: `Bazi automated ${cycle} ${state.runId}` })
    state.clockId = clock.id; await save()
    const customer = await stripe.customers.create({ name: `Bazi automated TEST ${cycle}`, test_clock: clock.id, metadata: { bazi_test_run: state.runId } })
    state.customerId = customer.id; await save()
    await insert('app_users', { id: state.userId, line_user_id: 'sandbox-lifecycle-' + state.runId, display_name: `AUTOMATED TEST ${cycle}` })
    await insert('user_entitlements', { user_id: state.userId, purchased_comparison_credits: 5, included_comparison_used: 3, free_comparison_used: true })
    await insert('birth_profiles', { user_id: state.userId, birth_date: '1990-01-01', birth_time: '12:00', gender: 'male', timezone_id: 'Asia/Bangkok' })
    await insert('comparison_reports', { user_id: state.userId, fingerprint: state.runId, person_name: 'Synthetic test person', birth_date: '1991-01-01', gender: 'female', timezone_id: 'Asia/Bangkok', relationship: 'friend', focus: 'overview', quota_source: 'premium', result_json: { test: true, score: 60 } })
    await insert('billing_customers', { user_id: state.userId, stripe_customer_id: customer.id })
    const order = await rest('rpc/reserve_billing_order', { method: 'POST', body: { p_user_id: state.userId, p_product: cycle } })
    state.orderId = order.id; await save()
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id })
    const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: config.prices[cycle] }], default_payment_method: pm.id, metadata: { order_id: order.id, bazi_test_run: state.runId } })
    state.subscriptionId = sub.id; await save()
    await paidViaWebhook(await stripe.invoices.retrieve(sub.latest_invoice))
    return
  }
  state = JSON.parse(await readFile(path, 'utf8'))
  await guard()
  let sub = await stripe.subscriptions.retrieve(state.subscriptionId)
  if (action === 'renew' || action === 'fail') {
    if (action === 'fail') {
      const pm = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', { customer: state.customerId })
      await stripe.subscriptions.update(sub.id, { default_payment_method: pm.id })
    }
    const before = await entitlement()
    const previousInvoice = sub.latest_invoice
    await advance(sub.items.data[0].current_period_end + 60)
    sub = await stripe.subscriptions.retrieve(sub.id)
    assert.notEqual(sub.latest_invoice, previousInvoice)
    let invoice = await stripe.invoices.retrieve(sub.latest_invoice)
    // Automatic collection runs after invoice finalization; don't pay it manually.
    if (invoice.status === 'draft' || !invoice.attempted) {
      const clock = await stripe.testHelpers.testClocks.retrieve(state.clockId)
      await advance(clock.frozen_time + 7200)
    }
    invoice = await until('automatic collection', async () => { const inv = await stripe.invoices.retrieve(sub.latest_invoice); return inv.attempted && inv.status !== 'draft' ? inv : null })
    if (action === 'renew') {
      await paidViaWebhook(invoice)
      assert(Date.parse(state.paidUntil) > Date.parse(before.premium_expires_at))
      const duplicate = await processBillingEvent({ livemode: false, type: 'invoice.paid', data: { object: { id: invoice.id } } }, { stripe, rest, config })
      assert.equal(duplicate.duplicate, true)
      log('duplicate_delivery_idempotent')
    } else {
      assert.equal(invoice.status, 'open'); assert.equal(invoice.amount_paid, 0)
      assert.equal((await entitlement()).premium_expires_at, before.premium_expires_at)
      assert.equal((await rest(`billing_payments?id=eq.${invoice.id}&select=id`)).length, 0)
      state.failedInvoice = invoice.id; await save()
      log('failed_payment_did_not_extend', { invoice: invoice.id, attempts: invoice.attempt_count })
    }
  } else if (action === 'verify-failure') {
    const invoice = await stripe.invoices.retrieve(sub.latest_invoice)
    assert.equal(invoice.status, 'open')
    assert.equal(invoice.amount_paid, 0)
    assert.equal(invoice.attempted, true)
    assert.equal((await entitlement()).premium_expires_at, state.paidUntil)
    assert.equal((await rest(`billing_payments?id=eq.${invoice.id}&select=id`)).length, 0)
    state.failedInvoice = invoice.id; await save()
    log('failed_payment_did_not_extend', { invoice: invoice.id, attempts: invoice.attempt_count })
  } else if (action === 'expire') {
    assert(state.failedInvoice, 'Run failure test first')
    const before = await readAccount(rest, state.userId, new Date(Date.parse(state.paidUntil) - 1000))
    assert.equal(before.entitlement.plan_id, 'premium')
    const after = await readAccount(rest, state.userId, new Date(Date.parse(state.paidUntil)))
    assert.equal(after.entitlement.plan_id, 'free')
    assert.equal(after.entitlement.purchased_comparison_credits, 5)
    assert.equal(after.entitlement.free_comparison_used, true)
    assert.deepEqual(after.birthProfile, before.birthProfile)
    assert.deepEqual(after.comparisonReports, before.comparisonReports)
    log('expiry_verified_real_db_local_clock', { plan: 'free', credits: 5, savedDataPreserved: true })
  } else if (action === 'cancel') {
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true })
    await advance(sub.items.data[0].current_period_end + 60)
    sub = await stripe.subscriptions.retrieve(sub.id)
    assert.equal(sub.status, 'canceled')
    assert.equal((await entitlement()).purchased_comparison_credits, 5)
    log('sandbox_cancellation_verified', { status: sub.status })
  }
}
main().catch(error => {
  // Never print full Stripe/HTTP errors, request headers, or environment values.
  log('failed', { type: error.type || error.name, code: error.code || null, detail: error instanceof assert.AssertionError ? 'Assertion failed; inspect sanitized step output' : error.message?.startsWith('Timeout:') ? error.message : 'Operation failed; secrets and response bodies suppressed' })
  process.exitCode = 1
})
