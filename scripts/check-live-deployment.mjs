// Non-financial smoke check: never creates a customer, order or real payment.
import Stripe from 'stripe'
const origin = 'https://bz-bazi.netlify.app'
try {
  const service = await fetch(origin + '/service.html')
  const html = await service.text()
  if (!service.ok || !html.includes('support.geniuspicture@gmail.com')
    || html.includes('ขณะนี้ระบบชำระเงินอยู่ในโหมดทดสอบ')) throw new Error('Service page check failed')
  console.log('Public service page: verified')
  const status = await fetch(origin + '/api/billing-session', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'status' })
  })
  if (status.status !== 401) throw new Error('Billing configuration/auth check failed')
  console.log('Billing configured; unsigned-in request rejected: 401')
  const unsigned = await fetch(origin + '/api/stripe-webhook', { method: 'POST', body: '{}' })
  if (unsigned.status !== 400) throw new Error('Webhook signature guard failed')
  console.log('Unsigned webhook rejected: 400')
  // Unknown diagnostic type takes the ignored branch and cannot grant rights.
  // This proves deployed signature and Live-mode selection, not Stripe delivery.
  const payload = JSON.stringify({ id: 'evt_bazi_readiness_probe', livemode: true,
    type: 'bazi.readiness.check', data: { object: {} } })
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET })
  const webhook = await fetch(origin + '/api/stripe-webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload
  })
  if (webhook.status !== 200) throw new Error('Live webhook configuration check failed')
  console.log('Signed non-financial Live diagnostic accepted: 200')
  console.log('PASS: hosted Live configuration and signature/auth guards. Actual Stripe Checkout, permissions to write, and payment delivery require owner testing.')
} catch {
  console.error('Hosted Live check not passed; inspect deployment before inviting payment. No credentials or raw provider errors are printed.')
  process.exitCode = 1
}
