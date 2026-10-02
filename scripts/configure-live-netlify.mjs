// Explicit owner-authorized Live switch. Secrets stay in memory and Netlify.
// Run with --env-file=.env.stripe-live-import; never prints provider responses.
import { readFile } from 'node:fs/promises'
import { billingConfig } from '../netlify/lib/billing.mjs'
const siteId = 'e5a5511e-5a2e-45e0-82e8-dd46e876e75e'
let phase = 'configuration'
try {
  if (!process.argv.includes('--activate')) throw new Error('Explicit activation required')
  const desired = { ...process.env, BILLING_MODE: 'live', BILLING_LIVE_ENABLED: 'true', BILLING_LIVE_SCHEMA_READY: 'true' }
  billingConfig(desired)
  const saved = JSON.parse(await readFile('C:/Users/anawa/AppData/Roaming/netlify/Config/config.json', 'utf8'))
  const token = process.env.NETLIFY_AUTH_TOKEN || saved.users?.[saved.userId]?.auth?.token
  if (!token) throw new Error('Netlify login required')
  async function api(path, method = 'GET', body) {
    const response = await fetch('https://api.netlify.com/api/v1' + path, {
      method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    })
    if (!response.ok) {
      const problem = await response.text()
      // Only fixed diagnostic booleans; provider bodies may contain secrets.
      console.error(JSON.stringify({ status: response.status, scopeIssue: /scope/i.test(problem),
        contextIssue: /context/i.test(problem), planIssue: /plan|upgrade/i.test(problem),
        alreadyExists: /already exist/i.test(problem) }))
      throw new Error('Netlify request failed')
    }
    return response.status === 204 ? null : response.json()
  }
  phase = 'site validation'
  const site = await api('/sites/' + siteId)
  if (site.name !== 'bz-bazi') throw new Error('Wrong site')
  const base = `/accounts/${site.account_id}/env`
  const query = '?site_id=' + siteId
  const current = await api(base + query)
  const keys = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_MONTHLY',
    'STRIPE_PRICE_YEARLY', 'STRIPE_PRICE_COMPARISON', 'BILLING_RETURN_ORIGIN',
    'BILLING_LIVE_SCHEMA_READY', 'BILLING_LIVE_ENABLED', 'BILLING_MODE']
  for (const key of keys) {
    phase = 'Netlify variable ' + key
    if (current.some(entry => entry.key === key)) {
      await api(base + '/' + key + query, 'PATCH', { context: 'production', value: desired[key] })
    } else {
      // Only these non-secret mode switches can be created across all scopes
      // on the Free plan. NEVER broaden scopes for an API/webhook key.
      if (!['BILLING_LIVE_SCHEMA_READY', 'BILLING_LIVE_ENABLED', 'BILLING_MODE'].includes(key)) {
        throw new Error('Secret/configuration variable must already exist with approved scopes')
      }
      await api(base + query, 'POST', [{ key, values: [{ context: 'production', value: desired[key] }] }])
    }
    console.log('Configured production: ' + key)
  }
  console.log('PASS: Live settings saved for production only. Existing LINE/Supabase variables and other contexts preserved. Deployment required.')
} catch {
  console.error('Live configuration stopped at: ' + phase + '. Do not deploy until resolved. No keys are logged.')
  process.exitCode = 1
}
