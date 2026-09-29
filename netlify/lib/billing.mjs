import Stripe from 'stripe'

export const products = {
  monthly: { amount: 14900, interval: 'month', mode: 'subscription', env: 'STRIPE_PRICE_MONTHLY' },
  yearly: { amount: 99900, interval: 'year', mode: 'subscription', env: 'STRIPE_PRICE_YEARLY' },
  comparison: { amount: 5900, mode: 'payment', env: 'STRIPE_PRICE_COMPARISON' }
}
export function billingConfig(env = process.env) {
  // Test-only until merchant approval and the paid-content security review.
  if (env.BILLING_TEST_ENABLED !== 'true' || !env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('billing_not_configured')
  const origin = new URL(env.BILLING_RETURN_ORIGIN)
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('billing_not_configured')
  const prices = Object.fromEntries(Object.entries(products).map(([key, product]) => [key, env[product.env]]))
  if (Object.values(prices).some(value => !value?.startsWith('price_')) || new Set(Object.values(prices)).size !== 3) throw new Error('billing_not_configured')
  return { secret: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, origin: origin.origin, prices }
}
export function stripeClient(config) { return new Stripe(config.secret, { maxNetworkRetries: 2, timeout: 15000 }) }
export function idOf(value) { return typeof value === 'string' ? value : value?.id }
export function subscriptionStatus(subscription) {
  const cancelAt = Number.isFinite(subscription.cancel_at) && subscription.cancel_at > 0 ? subscription.cancel_at : null
  return {
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    cancelAt,
    renewalCanceled: subscription.status === 'canceled' || subscription.cancel_at_period_end === true || cancelAt !== null,
    periodEnd: subscription.items?.data?.[0]?.current_period_end ?? null
  }
}
export function validatePrice(price, product) {
  if (!product || price.livemode || !price.active || price.currency !== 'thb' || price.unit_amount !== product.amount
    || (product.interval ? price.recurring?.interval !== product.interval || price.recurring?.interval_count !== 1 : Boolean(price.recurring))) throw new Error('invalid_price')
}
export function checkoutParameters({ order, customerId, priceId, origin }) {
  const product = products[order.product]
  if (!product) throw new Error('invalid_product')
  const metadata = { order_id: order.id }
  return {
    mode: product.mode, customer: customerId, client_reference_id: order.id,
    line_items: [{ price: priceId, quantity: 1 }], payment_method_types: ['card'],
    metadata, ...(product.mode === 'subscription' ? { subscription_data: { metadata } } : {}),
    success_url: origin + '/?billing=return#pricing', cancel_url: origin + '/?billing=cancel#pricing',
    expires_at: Math.floor(new Date(order.created_at).getTime() / 1000) + 3600,
    custom_text: { submit: { message: product.mode === 'subscription' ? 'ต่ออายุอัตโนมัติตามแพ็กเกจ ยกเลิกการต่ออายุได้ในหน้าสมาชิก โดยใช้สิทธิ์ได้จนสิ้นสุดรอบที่ชำระแล้ว' : 'ชำระครั้งเดียว ได้เครดิตเปรียบเทียบ 5 คน ไม่หมดอายุ' } }
  }
}
export async function processBillingEvent(event, { stripe, rest, config }) {
  if (event.livemode !== false) throw new Error('live_event_rejected')
  const object = event.data.object
  if (event.type === 'checkout.session.completed' && object.mode === 'payment') {
    const session = await stripe.checkout.sessions.retrieve(object.id, { expand: ['line_items.data.price'] })
    if (session.livemode || session.payment_status !== 'paid') return { ignored: true }
    const items = session.line_items
    if (items.has_more || items.data.length !== 1 || items.data[0].quantity !== 1 || idOf(items.data[0].price) !== config.prices.comparison
      || session.amount_total !== products.comparison.amount || session.currency !== 'thb') throw new Error('invalid_payment')
    return rest('rpc/apply_billing_payment', { method: 'POST', body: {
      p_payment_id: session.id, p_order_id: session.metadata.order_id, p_customer_id: idOf(session.customer),
      p_subscription_id: null, p_product: 'comparison', p_amount: session.amount_total, p_paid_until: null
    } })
  }
  if (event.type === 'invoice.paid') {
    const invoice = await stripe.invoices.retrieve(object.id)
    const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription)
    if (!subscriptionId) return { ignored: true }
    if (invoice.livemode || invoice.status !== 'paid' || invoice.currency !== 'thb' || !['subscription_create', 'subscription_cycle'].includes(invoice.billing_reason)) throw new Error('invalid_invoice')
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const item = subscription.items.data[0]
    const productKey = Object.keys(products).find(key => config.prices[key] === idOf(item?.price) && products[key].mode === 'subscription')
    if (!productKey || subscription.livemode || subscription.items.data.length !== 1 || item.quantity !== 1 || idOf(subscription.customer) !== idOf(invoice.customer)
      || invoice.amount_paid !== products[productKey].amount || invoice.lines.has_more || invoice.lines.data.length !== 1) throw new Error('invalid_invoice')
    const line = invoice.lines.data[0]
    if (idOf(line.pricing?.price_details?.price) !== config.prices[productKey] || line.quantity !== 1 || !Number.isFinite(line.period?.end)) throw new Error('invalid_invoice_line')
    return rest('rpc/apply_billing_payment', { method: 'POST', body: {
      p_payment_id: invoice.id, p_order_id: subscription.metadata.order_id, p_customer_id: idOf(invoice.customer),
      p_subscription_id: subscription.id, p_product: productKey, p_amount: invoice.amount_paid,
      p_paid_until: new Date(line.period.end * 1000).toISOString()
    } })
  }
  // Failed payments never extend paid access. Status is read live for management.
  return { ignored: true }
}
