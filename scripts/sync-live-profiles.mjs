// One-time pre-launch profile refresh. Refuses to run once Live billing exists.
// Does not copy any Sandbox payment, membership, credit or comparison report.
import { createSupabaseRest } from '../netlify/functions/line-session.mjs'
const config = { supabaseUrl: process.env.SUPABASE_URL,
  secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY }
if (!config.supabaseUrl || !config.secretKey) throw new Error('Missing database configuration')
const source = createSupabaseRest({ ...config, schema: 'public' })
const target = createSupabaseRest({ ...config, schema: 'bazi_live' })
async function all(rest, table, order) {
  const records = []
  for (let offset = 0; ; offset += 1000) {
    const page = await rest(`${table}?select=*&order=${order}&offset=${offset}&limit=1000`)
    records.push(...page)
    if (page.length < 1000) return records
  }
}
try {
  for (const table of ['billing_customers', 'billing_orders', 'billing_payments']) {
    if ((await target(`${table}?select=*&limit=1`)).length) throw new Error('Live billing already exists')
  }
  const rights = await all(target, 'user_entitlements', 'user_id')
  if (rights.some(row => row.plan_id !== 'free' || row.purchased_comparison_credits || row.free_comparison_used
    || row.included_comparison_used || row.next_membership)) throw new Error('Live rights already used')
  const users = await all(source, 'app_users', 'id')
  const liveUsers = await all(target, 'app_users', 'id')
  for (const user of users) {
    const existing = liveUsers.find(row => row.line_user_id === user.line_user_id)
    if (existing && existing.id !== user.id) throw new Error('Account identity mismatch')
  }
  const profiles = await all(source, 'birth_profiles', 'user_id')
  for (const user of users) {
    await target('app_users?on_conflict=id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: user })
    await target('user_entitlements?on_conflict=user_id', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: { user_id: user.id } })
  }
  for (const profile of profiles) await target('birth_profiles?on_conflict=user_id', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: profile
  })
  console.log(`PASS: refreshed ${users.length} account identities and ${profiles.length} birth profiles. No test payments or paid rights imported.`)
} catch {
  console.error('Profile refresh failed; stop the Live switch and inspect the database. No credentials or personal data are logged.')
  process.exitCode = 1
}
