// Disposable local PostgreSQL-compatible test. No Supabase connection.
import { PGlite } from '../.netlify/sql-qa/node_modules/@electric-sql/pglite/dist/index.js'
import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const db = new PGlite()
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
const dir = new URL('../supabase/migrations/', import.meta.url)
const migration = '202610050001_profile_details.sql'
for (const file of (await readdir(dir)).filter(file => file.endsWith('.sql') && file < migration).sort()) {
  await db.exec((await readFile(new URL(file, dir), 'utf8')).replace('create extension if not exists pgcrypto;', ''))
}
const user = '11111111-1111-4111-8111-111111111111'
for (const schema of ['public', 'bazi_live']) {
  await db.exec(`insert into ${schema}.app_users(id,line_user_id,display_name) values('${user}','Ufixture','Fixture');
    insert into ${schema}.user_entitlements(user_id,purchased_comparison_credits) values('${user}',5);
    insert into ${schema}.birth_profiles(user_id,birth_date,birth_time,gender,timezone_id) values('${user}','1989-08-26','11:30','male','Asia/Bangkok');`)
}
await db.exec(await readFile(new URL(migration, dir), 'utf8'))
await db.exec(await readFile(new URL(migration, dir), 'utf8')) // rerunnable
for (const schema of ['public', 'bazi_live']) {
  const saved = (await db.query(`select ${schema}.save_birth_profile('${user}','1989-08-26',null,'unspecified','Asia/Bangkok') as result`)).rows[0].result
  assert.equal(saved.allowed, true)
  assert.equal(saved.profile.birth_time, null)
  assert.equal(saved.profile.gender, 'unspecified')
  const version = saved.profile.profile_version
  await db.query(`update ${schema}.app_users set profile_details=$1 where id=$2`, [JSON.stringify({ relationshipStatus: 'single', bloodType: '', bloodConsent: false }), user])
  assert.equal((await db.query(`select profile_version from ${schema}.birth_profiles where user_id='${user}'`)).rows[0].profile_version, version)
  assert.equal((await db.query(`select purchased_comparison_credits from ${schema}.user_entitlements where user_id='${user}'`)).rows[0].purchased_comparison_credits, 5)
  for (const role of ['anon', 'authenticated']) assert.equal((await db.query(`select has_table_privilege('${role}','${schema}.app_users','select') as allowed`)).rows[0].allowed, false)
}
await db.close()
console.log('PASS: both schemas support incomplete profiles; optional details do not change birth versions, credits or table access. Migration is rerunnable.')
