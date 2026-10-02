import Stripe from 'stripe'
import { billingMode, matchesMode } from './billing-mode.mjs'

export const products = {
  monthly: { amount: 14900, interval: 'month', mode: 'subscription', env: 'STRIPE_PRICE_MONTHLY' },
  yearly: { amount: 99900, interval: 'year', mode: 'subscription', env: 'STRIPE_PRICE_YEARLY' },
  comparison: { amount: 5900, mode: 'payment', env: 'STRIPE_PRICE_COMPARISON' }
}
export function billingConfig(env = process.env) {
  const livemode = billingMode(env) === 'live'
  const prefix = livemode ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/
  if ((livemode ? env.BILLING_LIVE_ENABLED : env.BILLING_TEST_ENABLED) !== 'true'
    || !prefix.test(env.STRIPE_SECRET_KEY || '')
    || (livemode && env.BILLING_LIVE_SCHEMA_READY !== 'true')) throw new Error('billing_not_configured')
  const origin = new URL(env.BILLING_RETURN_ORIGIN)
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('billing_not_configured')
  if (livemode && (origin.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(origin.hostname)
    || !env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))) throw new Error('billing_not_configured')
  const prices = Object.fromEntries(Object.entries(products).map(([key, product]) => [key, env[product.env]]))
  if (Object.values(prices).some(value => !value?.startsWith('price_')) || new Set(Object.values(prices)).size !== 3) throw new Error('billing_not_configured')
  return { secret: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET, origin: origin.origin, prices, livemode }
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
    periodEnd: subscription.items?.data?.[0]?.current_period_end ?? null,
    billingCycle: subscription.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
    annualAdvance: subscription.metadata?.annual_advance === 'true',
    nextBillAt: subscription.trial_end ?? subscription.items?.data?.[0]?.current_period_end ?? null
  }
}
export function validatePrice(price, product, config = {}) {
  if (!product || !matchesMode(price, config) || !price.active || price.currency !== 'thb' || price.unit_amount !== product.amount
    || (product.interval ? price.recurring?.interval !== product.interval || price.recurring?.interval_count !== 1 : Boolean(price.recurring))) throw new Error('invalid_price')
}
export function checkoutParameters({ order, customerId, priceId, origin }) {
  const product = products[order.product]
  if (!product) throw new Error('invalid_product')
  const promptpay = order.payment_method === 'promptpay'
  const advance = order.product === 'yearly' && Boolean(order.advance_starts_at)
  const metadata = { order_id: order.id, ...(promptpay ? { product: order.product, payment_method: 'promptpay' } : {}), ...(advance ? { annual_advance: 'true' } : {}) }
  const mode = promptpay ? 'payment' : product.mode
  return {
    mode, customer: customerId, client_reference_id: order.id,
    line_items: promptpay ? [{ price_data: { currency: 'thb', unit_amount: product.amount, product_data: { name: order.product === 'comparison' ? 'เครดิตเปรียบเทียบ 5 คน' : `Premium ${order.product === 'monthly' ? '1 เดือน' : '1 ปี'} · ชำระครั้งเดียว` } }, quantity: 1 }] : [
      { price: priceId, quantity: 1 }, ...(advance ? [{ price_data: { currency: 'thb', unit_amount: product.amount, product_data: { name: 'Premium รายปี · ชำระล่วงหน้า 1 ปี', metadata: { annual_advance_order: order.id } } }, quantity: 1 }] : [])
    ],
    payment_method_types: [promptpay ? 'promptpay' : 'card'],
    metadata, ...(mode === 'subscription' ? { subscription_data: { metadata, ...(advance ? { trial_end: Math.floor(Date.parse(order.advance_expires_at) / 1000) } : {}) } } : { payment_intent_data: { metadata } }),
    success_url: origin + '/?billing=return#pricing', cancel_url: origin + '/?billing=cancel#pricing',
    expires_at: Math.floor(new Date(order.created_at).getTime() / 1000) + 3600,
    custom_text: { submit: { message: advance ? `ชำระรายปี 999 บาทวันนี้ เริ่มใช้ ${new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium' }).format(new Date(order.advance_starts_at))} ระบบยกเลิกต่ออายุรายเดือนเดิมเมื่อชำระสำเร็จ ${promptpay ? 'รายปีไม่ต่ออายุอัตโนมัติ' : 'ต่ออายุรายปีอัตโนมัติหลังจบปีที่ชำระล่วงหน้า'} ` : mode === 'subscription' ? 'ต่ออายุอัตโนมัติตามแพ็กเกจ ยกเลิกการต่ออายุได้ในหน้าสมาชิก โดยใช้สิทธิ์ได้จนสิ้นสุดรอบที่ชำระแล้ว' : order.product === 'comparison' ? 'ชำระครั้งเดียว ได้เครดิตเปรียบเทียบ 5 คน ไม่หมดอายุ' : `ชำระครั้งเดียว ใช้ Premium ${order.product === 'monthly' ? '1 เดือน' : '1 ปี'} ไม่ต่ออายุอัตโนมัติ หากซื้อแพ็กเกจเดิมเพิ่มขณะยังมีสิทธิ์ ระบบจะเพิ่มเวลาจากวันหมดอายุเดิม` } }
  }
}
export async function fulfillAnnualAdvance({ orderId, customerId, paymentId, subscriptionId = null, amount }, { stripe, rest, config }) {
  const [order] = await rest(`billing_orders?id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`)
  if (!order || order.product !== 'yearly' || !order.advance_starts_at || !order.advance_expires_at || amount !== 99900
    || (order.payment_method === 'card') !== Boolean(subscriptionId)) throw new Error('invalid_advance_order')
  const [owner] = await rest(`billing_customers?user_id=eq.${order.user_id}&select=stripe_customer_id&limit=1`)
  if (owner?.stripe_customer_id !== customerId) throw new Error('payment_owner_mismatch')
  if (order.status !== 'paid') {
    const [membership] = await rest(`user_entitlements?user_id=eq.${order.user_id}&select=billing_cycle,premium_expires_at,next_membership&limit=1`)
    if (!membership || membership.billing_cycle !== 'monthly' || membership.next_membership
      || (membership.premium_expires_at && Date.parse(membership.premium_expires_at) !== Date.parse(order.advance_starts_at))) throw new Error('membership_period_changed')
  }
  if (order.replaces_subscription_id && order.status !== 'paid') {
    const previous = await stripe.subscriptions.retrieve(order.replaces_subscription_id)
    if (!matchesMode(previous, config) || idOf(previous.customer) !== customerId || previous.items?.data?.length !== 1
      || idOf(previous.items.data[0].price) !== config.prices.monthly) throw new Error('invalid_monthly_subscription')
    if (previous.status !== 'canceled') {
      const end = Math.floor(Date.parse(order.advance_starts_at) / 1000)
      if (end > Math.floor(Date.now() / 1000)) {
        await stripe.subscriptions.update(previous.id, { cancel_at: end, proration_behavior: 'none' }, { idempotencyKey: `bazi-annual-cancel-${order.id}` })
      } else {
        await stripe.subscriptions.cancel(previous.id, { prorate: false, invoice_now: false })
      }
    }
  }
  return rest('rpc/apply_annual_advance_payment', { method: 'POST', body: {
    p_payment_id: paymentId, p_order_id: orderId, p_customer_id: customerId, p_subscription_id: subscriptionId, p_amount: amount
  } })
}
export async function processBillingEvent(event, { stripe, rest, config }) {
  if (!matchesMode(event, config)) throw new Error('billing_mode_mismatch')
  const object = event.data.object
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && object.mode === 'payment') {
    const session = await stripe.checkout.sessions.retrieve(object.id, { expand: ['line_items.data.price', 'payment_intent.payment_method'] })
    if (!matchesMode(session, config)) throw new Error('billing_mode_mismatch')
    if (session.payment_status !== 'paid') return { ignored: true }
    const items = session.line_items
    if (session.metadata?.payment_method === 'promptpay') {
      const product = products[session.metadata.product]
      const intent = session.payment_intent
      const item = items.data[0]
      if (!product || items.has_more || items.data.length !== 1 || item.quantity !== 1 || item.price?.recurring
        || item.price?.currency !== 'thb' || item.price?.unit_amount !== product.amount
        || session.amount_total !== product.amount || session.currency !== 'thb' || session.client_reference_id !== session.metadata.order_id
        || intent?.status !== 'succeeded' || intent.amount_received !== product.amount || intent.currency !== 'thb'
        || !matchesMode(intent, config) || intent.payment_method?.type !== 'promptpay' || idOf(intent.customer) !== idOf(session.customer)
        || intent.metadata?.order_id !== session.metadata.order_id) throw new Error('invalid_promptpay_payment')
      if (session.metadata.annual_advance === 'true') return fulfillAnnualAdvance({ orderId: session.metadata.order_id, customerId: idOf(session.customer), paymentId: session.id, amount: session.amount_total }, { stripe, rest, config })
      return rest('rpc/apply_promptpay_payment', { method: 'POST', body: {
        p_payment_id: session.id, p_order_id: session.metadata.order_id, p_customer_id: idOf(session.customer),
        p_product: session.metadata.product, p_amount: session.amount_total
      } })
    }
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
    if (!matchesMode(invoice, config) || invoice.status !== 'paid' || invoice.currency !== 'thb' || !['subscription_create', 'subscription_cycle'].includes(invoice.billing_reason)) throw new Error('invalid_invoice')
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const item = subscription.items.data[0]
    const productKey = Object.keys(products).find(key => config.prices[key] === idOf(item?.price) && products[key].mode === 'subscription')
    if (subscription.metadata?.annual_advance === 'true' && invoice.billing_reason === 'subscription_create') {
      if (productKey !== 'yearly' || !matchesMode(subscription, config) || subscription.items.data.length !== 1 || item.quantity !== 1
        || idOf(subscription.customer) !== idOf(invoice.customer) || invoice.amount_paid !== 99900 || invoice.lines.has_more
        || invoice.lines.data.length !== 2) throw new Error('invalid_advance_invoice')
      const prepaid = invoice.lines.data.find(line => line.amount === 99900)
      const deferred = invoice.lines.data.find(line => line.amount === 0 && idOf(line.pricing?.price_details?.price) === config.prices.yearly)
      if (!prepaid || !deferred || prepaid.quantity !== 1 || deferred.quantity !== 1) throw new Error('invalid_advance_invoice')
      const upfrontPrice = await stripe.prices.retrieve(idOf(prepaid.pricing?.price_details?.price))
      // Stripe archives inline one-time prices immediately; active=false is expected.
      // The paid invoice, currency, exact amount and absence of recurrence remain mandatory.
      if (!matchesMode(upfrontPrice, config) || upfrontPrice.currency !== 'thb' || upfrontPrice.unit_amount !== 99900 || upfrontPrice.recurring) throw new Error('invalid_advance_price')
      const [order] = await rest(`billing_orders?id=eq.${encodeURIComponent(subscription.metadata.order_id)}&select=*&limit=1`)
      if (!order?.advance_expires_at || subscription.trial_end !== Math.floor(Date.parse(order.advance_expires_at) / 1000)) throw new Error('invalid_advance_invoice')
      return fulfillAnnualAdvance({ orderId: order.id, customerId: idOf(invoice.customer), paymentId: invoice.id, subscriptionId: subscription.id, amount: invoice.amount_paid }, { stripe, rest, config })
    }
    if (!productKey || !matchesMode(subscription, config) || subscription.items.data.length !== 1 || item.quantity !== 1 || idOf(subscription.customer) !== idOf(invoice.customer)
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
