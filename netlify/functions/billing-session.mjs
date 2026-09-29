import { createSupabaseRest, requiredEnvironment, verifyLineIdToken } from './line-session.mjs'
import { billingConfig, stripeClient, products, validatePrice, checkoutParameters } from '../lib/billing.mjs'

export default async request => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 })
  try {
    const config = billingConfig()
    const server = requiredEnvironment()
    const body = await request.json()
    if (!['status', 'checkout', 'portal'].includes(body.action)) return Response.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400 })
    const identity = await verifyLineIdToken(body.idToken, server.channelId)
    const rest = createSupabaseRest(server)
    const [user] = await rest('app_users?line_user_id=eq.' + encodeURIComponent(identity.sub) + '&select=id&limit=1')
    if (!user) return Response.json({ error: 'กรุณาเปิดบัญชี LINE ก่อน' }, { status: 401 })
    const stripe = stripeClient(config)
    let [customer] = await rest('billing_customers?user_id=eq.' + user.id + '&select=*&limit=1')
    if (!customer && body.action === 'status') return Response.json({ enabled: true, testMode: true, payments: [], subscriptions: [], hasCustomer: false })
    if (!customer && body.action === 'portal') return Response.json({ error: 'ยังไม่มีข้อมูลการชำระเงิน' }, { status: 409 })
    if (body.action === 'checkout' && !products[body.product]) return Response.json({ error: 'แพ็กเกจไม่ถูกต้อง' }, { status: 400 })
    if (!customer) {
      const created = await stripe.customers.create({ metadata: { user_id: user.id } }, { idempotencyKey: 'bazi-customer-' + user.id })
      ;[customer] = await rest('billing_customers?on_conflict=user_id&select=*', { method: 'POST', prefer: 'resolution=merge-duplicates,return=representation', body: { user_id: user.id, stripe_customer_id: created.id } })
    }
    const subscriptions = await stripe.subscriptions.list({ customer: customer.stripe_customer_id, status: 'all', limit: 100 })
    if (body.action === 'status') {
      const payments = await rest('billing_payments?user_id=eq.' + user.id + '&select=id,product,amount,created_at&order=created_at.desc&limit=20')
      return Response.json({ enabled: true, testMode: true, payments, hasCustomer: true, subscriptions: subscriptions.data.map(sub => ({ status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end, periodEnd: sub.items.data[0]?.current_period_end ?? null })) })
    }
    if (body.action === 'portal') {
      const portalConfig = await stripe.billingPortal.configurations.create({ features: {
        invoice_history: { enabled: true }, payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' }, subscription_update: { enabled: false }
      } }, { idempotencyKey: 'bazi-test-portal-v1' })
      const portal = await stripe.billingPortal.sessions.create({ customer: customer.stripe_customer_id, configuration: portalConfig.id, return_url: config.origin + '/?billing=return#pricing' })
      return Response.json({ url: portal.url })
    }
    const product = products[body.product]
    if (product.mode === 'subscription' && (subscriptions.has_more || subscriptions.data.some(sub => !['canceled', 'incomplete_expired'].includes(sub.status)))) return Response.json({ error: 'มีสมาชิกหรือรายการสมัครอยู่แล้ว กรุณาจัดการสมาชิกเดิมก่อน' }, { status: 409 })
    validatePrice(await stripe.prices.retrieve(config.prices[body.product]), product)
    const order = await rest('rpc/reserve_billing_order', { method: 'POST', body: { p_user_id: user.id, p_product: body.product } })
    if (order.product !== body.product) return Response.json({ error: 'มีรายการสมัครอีกแพ็กเกจที่ยังไม่เสร็จ กรุณารอให้รายการเดิมหมดอายุก่อน (ไม่เกิน 65 นาที)' }, { status: 409 })
    if (Date.now() > new Date(order.created_at).getTime() + 29 * 60000) return Response.json({ error: 'กรุณาใช้หน้าชำระเงินเดิม หรือรอให้รายการเดิมหมดอายุแล้วลองใหม่' }, { status: 409 })
    const checkout = await stripe.checkout.sessions.create(checkoutParameters({ order, customerId: customer.stripe_customer_id, priceId: config.prices[body.product], origin: config.origin }), { idempotencyKey: 'bazi-checkout-' + order.id })
    return Response.json({ url: checkout.url, testMode: true })
  } catch (error) {
    const auth = /LINE ID token|token verification/.test(error.message)
    const unavailable = /billing_not_configured|Invalid URL|Missing server configuration/.test(error.message)
    console.error('billing-session failed', { kind: auth ? 'auth' : unavailable ? 'configuration' : 'billing' })
    return Response.json({ error: auth ? 'กรุณาเชื่อมต่อ LINE อีกครั้ง' : unavailable ? 'ระบบชำระเงินทดสอบยังตั้งค่าไม่ครบ' : 'ยังทำรายการไม่ได้ กรุณาลองใหม่อีกครั้ง' }, { status: auth ? 401 : unavailable ? 503 : 500 })
  }
}
export const config = { path: '/api/billing-session' }
