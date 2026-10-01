// Service-role RPC integration test with explicitly synthetic rows, not a QR payment.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { billingConfig } from '../netlify/lib/billing.mjs'
import { createSupabaseRest } from '../netlify/functions/line-session.mjs'
billingConfig()
assert.equal(process.env.SUPABASE_URL, 'https://ysdzzfobxrwhhqlpjluu.supabase.co')
const rest = createSupabaseRest({ supabaseUrl: process.env.SUPABASE_URL, secretKey: process.env.SUPABASE_SECRET_KEY })
const user = randomUUID()
const customer = 'cus_synthetic_promptpay_' + user
const insert = (table, body) => rest(table, { method: 'POST', body, prefer: 'return=representation' })
const entitlement = async () => (await rest(`user_entitlements?user_id=eq.${user}&select=*`))[0]
const reserve = product => rest('rpc/reserve_billing_order_v2', { method: 'POST', body: { p_user_id: user, p_product: product, p_payment_method: 'promptpay' } })
const apply = (order, suffix, amount, owner = customer) => rest('rpc/apply_promptpay_payment', { method: 'POST', body: {
  p_payment_id: `cs_synthetic_pp_${user}_${suffix}`, p_order_id: order.id, p_customer_id: owner, p_product: order.product, p_amount: amount
} })
await rest('user_entitlements?select=billing_payment_method&limit=0')
await insert('app_users', { id: user, line_user_id: 'synthetic-promptpay-' + user, display_name: 'SYNTHETIC PROMPTPAY RPC TEST' })
await insert('user_entitlements', { user_id: user, included_comparison_used: 3, purchased_comparison_credits: 5 })
await insert('billing_customers', { user_id: user, stripe_customer_id: customer })
const monthly = await reserve('monthly')
assert.equal((await reserve('monthly')).id, monthly.id)
await assert.rejects(() => apply(monthly, 'wrong', 14900, 'cus_wrong'), /payment_owner_mismatch/)
await assert.rejects(() => apply(monthly, 'amount', 1), /payment_amount_mismatch/)
await apply(monthly, 'monthly', 14900)
const first = await entitlement()
assert.equal(first.billing_cycle, 'monthly')
assert.equal(first.billing_payment_method, 'promptpay')
assert(Date.parse(first.premium_expires_at) > Date.now() + 27 * 86400000)
assert.equal((await apply(monthly, 'monthly', 14900)).duplicate, true)
assert.equal((await entitlement()).premium_expires_at, first.premium_expires_at)
await assert.rejects(() => rest('rpc/reserve_billing_order_v2', { method: 'POST', body: { p_user_id: user, p_product: 'monthly', p_payment_method: 'card' } }), /active_membership_conflict/)
const extension = await reserve('monthly')
await apply(extension, 'extension', 14900)
assert(Date.parse((await entitlement()).premium_expires_at) > Date.parse(first.premium_expires_at) + 27 * 86400000)
const credit = await reserve('comparison')
await apply(credit, 'credits', 5900)
assert.equal((await apply(credit, 'credits', 5900)).duplicate, true)
assert.equal((await entitlement()).purchased_comparison_credits, 10)
await rest(`user_entitlements?user_id=eq.${user}`, { method: 'PATCH', body: { premium_expires_at: '2020-01-01T00:00:00Z' } })
const annual = await reserve('yearly')
await apply(annual, 'annual', 99900)
const final = await entitlement()
assert.equal(final.billing_cycle, 'yearly')
assert(Date.parse(final.premium_expires_at) > Date.now() + 364 * 86400000)
assert.equal(final.included_comparison_used, 3)
assert.equal(final.purchased_comparison_credits, 10)
const payments = await rest(`billing_payments?user_id=eq.${user}&select=id,payment_method`)
assert.equal(payments.length, 4)
assert(payments.every(p => p.payment_method === 'promptpay'))
// Leave clearly marked audit rows, with no usable membership on this fixture.
await rest(`user_entitlements?user_id=eq.${user}`, { method: 'PATCH', body: { plan_id: 'free', premium_expires_at: '2020-01-01T00:00:00Z' } })
console.log(JSON.stringify({ schemaReady: true, monthly: true, extension: true, annual: true, duplicateSafe: true, ownerAndAmountChecked: true, quotaPreserved: true, syntheticUserId: user, actualQrPaymentTested: false }))
