import { createSupabaseRest, requiredEnvironment } from './line-session.mjs'
import { billingConfig, stripeClient, processBillingEvent } from '../lib/billing.mjs'
export default async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  let event, stripe, config
  try {
    config = billingConfig()
    if (!config.webhookSecret?.startsWith('whsec_')) return new Response('Not configured', { status: 503 })
    stripe = stripeClient(config)
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature'), config.webhookSecret)
  } catch { return new Response('Invalid signature or configuration', { status: 400 }) }
  try {
    const rest = createSupabaseRest(requiredEnvironment())
    await processBillingEvent(event, { stripe, rest, config })
    return Response.json({ received: true })
  } catch {
    console.error('stripe-webhook processing failed', { eventId: event.id, type: event.type })
    return new Response('Processing failed; retry required', { status: 500 })
  }
}
export const config = { path: '/api/stripe-webhook' }

