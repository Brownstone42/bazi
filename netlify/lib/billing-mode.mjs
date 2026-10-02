// Server-owned mode only. Never accept a mode or schema from a browser request.
export function billingMode(env = process.env) {
  const mode = env.BILLING_MODE || 'test'
  if (!['test', 'live'].includes(mode)) throw new Error('billing_not_configured')
  return mode
}
export function accountSchema(env = process.env) {
  return billingMode(env) === 'live' ? 'bazi_live' : 'public'
}
export function matchesMode(object, config) {
  return object?.livemode === (config.livemode === true)
}
