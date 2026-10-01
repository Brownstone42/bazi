// Provider configuration smoke test. Creates only TEST customers and unpaid sessions.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { billingConfig, stripeClient, checkoutParameters } from '../netlify/lib/billing.mjs'
const config = billingConfig()
assert.equal(config.origin, 'https://bz-bazi.netlify.app')
const stripe = stripeClient(config)
const run = randomUUID()
const customer = await stripe.customers.create({ name: 'Bazi PromptPay TEST', metadata: { bazi_test_run: run } })
assert.equal(customer.livemode, false)
for (const product of ['monthly', 'yearly', 'comparison']) {
  const order = { id: randomUUID(), product, payment_method: 'promptpay', created_at: new Date().toISOString() }
  const session = await stripe.checkout.sessions.create(checkoutParameters({ order, customerId: customer.id, origin: config.origin }))
  assert.equal(session.livemode, false)
  assert.equal(session.mode, 'payment')
  assert.deepEqual(session.payment_method_types, ['promptpay'])
  console.log(JSON.stringify({ product, accepted: true, amount: session.amount_total, paymentMethod: session.payment_method_types[0] }))
  await stripe.checkout.sessions.expire(session.id)
}
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
assert.equal(endpoints.has_more, false)
const endpoint = endpoints.data.find(e => e.url === config.origin + '/api/stripe-webhook' && !e.livemode && e.status === 'enabled')
assert(endpoint, 'Enabled test webhook required')
if (!endpoint.enabled_events.includes('*') && !endpoint.enabled_events.includes('checkout.session.async_payment_succeeded')) {
  await stripe.webhookEndpoints.update(endpoint.id, { enabled_events: [...endpoint.enabled_events, 'checkout.session.async_payment_succeeded'] })
}
console.log(JSON.stringify({ webhookAsyncSuccessEnabled: true, testOnly: true }))
