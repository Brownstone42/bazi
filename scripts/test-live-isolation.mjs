// Local PostgreSQL-compatible verification only. Never connects to Supabase/Stripe.
// npm install --prefix .netlify/sql-qa --no-save --package-lock=false @electric-sql/pglite
// node scripts/test-live-isolation.mjs
import { PGlite } from '../.netlify/sql-qa/node_modules/@electric-sql/pglite/dist/index.js'
import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const db = new PGlite()
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
const dir = new URL('../supabase/migrations/', import.meta.url)
const migration = '202610020001_live_account_isolation.sql'
for (const file of (await readdir(dir)).filter(file => file.endsWith('.sql') && file < migration).sort()) {
  // PGlite has gen_random_uuid built in; pgcrypto is not installed in this runner.
  await db.exec((await readFile(new URL(file, dir), 'utf8')).replace('create extension if not exists pgcrypto;', ''))
}
const user = '11111111-1111-4111-8111-111111111111'
await db.exec(`insert into public.app_users(id,line_user_id,display_name) values('${user}','Ufixture','Fixture');
  insert into public.birth_profiles(user_id,birth_date,birth_time,gender,timezone_id) values('${user}','1989-08-26','11:30','male','Asia/Bangkok');
  insert into public.user_entitlements(user_id,plan_id,premium_expires_at,purchased_comparison_credits) values('${user}','premium',now()+interval '1 year',25);`)
await db.exec(await readFile(new URL(migration, dir), 'utf8'))
const row = (await db.query(`select * from bazi_live.user_entitlements where user_id='${user}'`)).rows[0]
assert.equal(row.plan_id, 'free')
assert.equal(row.purchased_comparison_credits, 0)
assert.equal(row.next_membership, null)
assert.equal((await db.query(`select count(*)::int as n from bazi_live.birth_profiles`)).rows[0].n, 1)
assert.equal((await db.query(`select purchased_comparison_credits from public.user_entitlements where user_id='${user}'`)).rows[0].purchased_comparison_credits, 25)
const functions = await db.query(`select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='bazi_live'`)
assert.equal(functions.rows.length, 11)
for (const { def } of functions.rows) {
  assert.ok(!def.includes('public.'))
  assert.match(def, /SET search_path TO 'bazi_live', 'pg_catalog'/)
}
for (const role of ['anon','authenticated']) {
  const privileges = await db.query(`select has_schema_privilege('${role}','bazi_live','usage') as schema_access,
    has_table_privilege('${role}','bazi_live.user_entitlements','select') as table_access,
    has_function_privilege('${role}','bazi_live.apply_billing_payment(text,uuid,text,text,text,integer,timestamptz)','execute') as rpc_access`)
  assert.deepEqual(privileges.rows[0], { schema_access: false, table_access: false, rpc_access: false })
}
const order = (await db.query(`select bazi_live.reserve_billing_order_v2('${user}','comparison','card') as o`)).rows[0].o
await db.exec(`insert into bazi_live.billing_customers(user_id,stripe_customer_id) values('${user}','cus_live_fixture')`)
const payment = `select bazi_live.apply_billing_payment('cs_live_fixture','${order.id}','cus_live_fixture',null,'comparison',5900,null) as result`
await db.query(payment)
assert.equal((await db.query(payment)).rows[0].result.duplicate, true)
assert.equal((await db.query(`select purchased_comparison_credits from bazi_live.user_entitlements where user_id='${user}'`)).rows[0].purchased_comparison_credits, 5)
assert.equal((await db.query(`select purchased_comparison_credits from public.user_entitlements where user_id='${user}'`)).rows[0].purchased_comparison_credits, 25)
assert.equal((await db.query('select count(*)::int as n from public.billing_payments')).rows[0].n, 0)
await db.exec(`update bazi_live.user_entitlements set plan_id='premium', billing_cycle='yearly',
  premium_expires_at=now()+interval '1 year', included_comparison_used=9,
  comparison_period_start='2000-01-01' where user_id='${user}'`)
const refreshed = (await db.query(`select bazi_live.refresh_account_entitlement('${user}') as e`)).rows[0].e
assert.equal(refreshed.plan_id, 'premium')
assert.equal(refreshed.included_comparison_used, 0)
assert.equal(refreshed.purchased_comparison_credits, 5)
await db.exec(`update bazi_live.user_entitlements set premium_expires_at=now()-interval '1 second' where user_id='${user}'`)
const expired = (await db.query(`select bazi_live.refresh_account_entitlement('${user}') as e`)).rows[0].e
assert.equal(expired.plan_id, 'free')
assert.equal(expired.purchased_comparison_credits, 5)
console.log('PASS: Live schema migration, preserved profiles, clean rights, service-only permissions, isolated payment and duplicate protection.')
await db.close()
