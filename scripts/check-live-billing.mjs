// Read-only provider check. Does not enable billing, create payments or print keys.
// node --env-file=.env.billing-test.local --env-file=.env.stripe-live-import scripts/check-live-billing.mjs
import { billingConfig, stripeClient, validatePrice, products } from '../netlify/lib/billing.mjs'
let phase = 'configuration'
try {
  if (process.env.BILLING_MODE !== 'live') throw new Error('invalid_mode')
  const config = billingConfig({ ...process.env, BILLING_LIVE_ENABLED: 'true', BILLING_LIVE_SCHEMA_READY: 'true' })
  const stripe = stripeClient(config)
  phase = 'prices'
  for (const [name, product] of Object.entries(products)) {
    const price = await stripe.prices.retrieve(config.prices[name])
    validatePrice(price, product, config)
    console.log(`${name}: Live price verified (${product.amount / 100} THB)`)
  }
  phase = 'account'
  const account = await stripe.accounts.retrieve()
  console.log(`Stripe charges enabled: ${account.charges_enabled === true}`)
  console.log(`Stripe payouts enabled: ${account.payouts_enabled === true}`)
  console.log(`Stripe details submitted: ${account.details_submitted === true}`)
  console.log(`Outstanding required fields: ${account.requirements?.currently_due?.length ?? 0}`)
  if (!account.charges_enabled) throw new Error('account_not_ready')
  phase = 'portal permissions'
  await stripe.billingPortal.configurations.list({ limit: 1 })
  phase = 'subscription permissions'
  await stripe.subscriptions.list({ limit: 1 })
  console.log('PASS: read-only Live price/account/portal/subscription checks. Billing remains disabled; write permissions and real-money flows are not tested.')
} catch (error) {
  // Stripe invalid-key errors can contain key fragments; never log message/stack.
  console.error(`Live readiness check failed at: ${phase}`)
  console.error(`Category: ${error.type || 'configuration_or_readiness'}`)
  process.exitCode = 1
}
