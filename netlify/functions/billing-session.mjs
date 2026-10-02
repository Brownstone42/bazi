import { createSupabaseRest, requiredEnvironment, verifyLineIdToken } from './line-session.mjs'
import { billingConfig, stripeClient, products, validatePrice, checkoutParameters, subscriptionStatus } from '../lib/billing.mjs'

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
    if (!customer && body.action === 'status') return Response.json({ enabled: true, testMode: !config.livemode, payments: [], subscriptions: [], hasCustomer: false }, { headers: { 'Cache-Control': 'no-store' } })
    if (!customer && body.action === 'portal') return Response.json({ error: 'ยังไม่มีข้อมูลการชำระเงิน' }, { status: 409 })
    if (body.action === 'checkout' && !Object.hasOwn(products, body.product)) return Response.json({ error: 'แพ็กเกจไม่ถูกต้อง' }, { status: 400 })
    const paymentMethod = body.paymentMethod ?? 'card'
    if (body.action === 'checkout' && !['card', 'promptpay'].includes(paymentMethod)) return Response.json({ error: 'วิธีชำระเงินไม่ถูกต้อง' }, { status: 400 })
    if (!customer) {
      const created = await stripe.customers.create({ metadata: { user_id: user.id } }, { idempotencyKey: 'bazi-customer-' + user.id })
      ;[customer] = await rest('billing_customers?on_conflict=user_id&select=*', { method: 'POST', prefer: 'resolution=merge-duplicates,return=representation', body: { user_id: user.id, stripe_customer_id: created.id } })
    }
    const subscriptions = await stripe.subscriptions.list({ customer: customer.stripe_customer_id, status: 'all', limit: 100 })
    if (body.action === 'status') {
      const payments = await rest('billing_payments?user_id=eq.' + user.id + '&select=id,product,amount,created_at,payment_method,paid_until&order=created_at.desc&limit=20')
      return Response.json({ enabled: true, testMode: !config.livemode, payments, hasCustomer: true, subscriptions: subscriptions.data.map(subscriptionStatus) }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (body.action === 'portal') {
      const portalConfig = await stripe.billingPortal.configurations.create({ features: {
        invoice_history: { enabled: true }, payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' }, subscription_update: { enabled: false }
      } }, { idempotencyKey: `bazi-${config.livemode ? 'live' : 'test'}-portal-v1` })
      const portal = await stripe.billingPortal.sessions.create({ customer: customer.stripe_customer_id, configuration: portalConfig.id, return_url: config.origin + '/?billing=return#pricing' })
      return Response.json({ url: portal.url })
    }
    const product = products[body.product]
    let [entitlement] = await rest('user_entitlements?user_id=eq.' + user.id + '&select=plan_id,billing_cycle,premium_expires_at,billing_payment_method,next_membership&limit=1')
    if (entitlement?.next_membership && new Date(entitlement.next_membership.startsAt) <= new Date()) entitlement = await rest('rpc/activate_annual_membership', { method: 'POST', body: { p_user_id: user.id } })
    if (body.product !== 'comparison' && entitlement?.next_membership) return Response.json({ error: 'ซื้อรายปีล่วงหน้าแล้ว ดูวันเริ่มใช้งานได้ที่สมาชิกของฉัน' }, { status: 409 })
    const advance = body.product === 'yearly' && entitlement?.plan_id === 'premium' && entitlement.billing_cycle === 'monthly' && new Date(entitlement.premium_expires_at) > new Date()
    const liveSubscriptions = subscriptions.data.filter(sub => !['canceled', 'incomplete_expired'].includes(sub.status))
    if (product.mode === 'subscription' && (subscriptions.has_more || (advance && liveSubscriptions.length > 1) || liveSubscriptions.some(sub => !advance || sub.items?.data?.length !== 1 || sub.items.data[0]?.price?.id !== config.prices.monthly))) return Response.json({ error: 'มีสมาชิกหรือรายการสมัครอยู่แล้ว กรุณาจัดการสมาชิกเดิมก่อน' }, { status: 409 })
    if (body.product !== 'comparison' && entitlement?.plan_id === 'premium' && new Date(entitlement.premium_expires_at) > new Date()
      && !advance && !(paymentMethod === 'promptpay' && entitlement.billing_payment_method === 'promptpay' && entitlement.billing_cycle === body.product)) {
      return Response.json({ error: 'คุณมี Premium อยู่แล้ว หากชำระผ่าน PromptPay สามารถซื้อแพ็กเกจเดิมเพิ่มได้ ส่วนการเปลี่ยนแพ็กเกจหรือวิธีชำระให้รอสมาชิกเดิมหมดอายุก่อน' }, { status: 409 })
    }
    if (paymentMethod === 'card') validatePrice(await stripe.prices.retrieve(config.prices[body.product]), product, config)
    const order = await rest('rpc/reserve_billing_order_v2', { method: 'POST', body: { p_user_id: user.id, p_product: body.product, p_payment_method: paymentMethod } })
    if (order.product !== body.product || order.payment_method !== paymentMethod) return Response.json({ error: 'มีหน้าชำระเงินเดิมที่ยังไม่เสร็จ กรุณาใช้แพ็กเกจและวิธีชำระเดิม หรือรอให้รายการเดิมหมดอายุ (ไม่เกิน 65 นาที)' }, { status: 409 })
    if (advance && (!order.advance_starts_at || Date.parse(order.advance_starts_at) !== Date.parse(entitlement.premium_expires_at))) return Response.json({ error: 'ช่วงสมาชิกเปลี่ยนแล้ว กรุณารอรายการเดิมหมดอายุแล้วลองใหม่' }, { status: 409 })
    if (Date.now() > new Date(order.created_at).getTime() + 29 * 60000) return Response.json({ error: 'กรุณาใช้หน้าชำระเงินเดิม หรือรอให้รายการเดิมหมดอายุแล้วลองใหม่' }, { status: 409 })
    const checkout = await stripe.checkout.sessions.create(checkoutParameters({ order, customerId: customer.stripe_customer_id, priceId: config.prices[body.product], origin: config.origin }), { idempotencyKey: 'bazi-checkout-' + order.id })
    return Response.json({ url: checkout.url, testMode: !config.livemode })
  } catch (error) {
    const auth = /LINE ID token|token verification/.test(error.message)
    const unavailable = /billing_not_configured|Invalid URL|Missing server configuration/.test(error.message)
    console.error('billing-session failed', { kind: auth ? 'auth' : unavailable ? 'configuration' : 'billing' })
    return Response.json({ error: auth ? 'กรุณาเชื่อมต่อ LINE อีกครั้ง' : unavailable ? 'ระบบชำระเงินยังไม่เปิดให้บริการ' : 'ยังทำรายการไม่ได้ กรุณาลองใหม่อีกครั้ง' }, { status: auth ? 401 : unavailable ? 503 : 500 })
  }
}
export const config = { path: '/api/billing-session' }
