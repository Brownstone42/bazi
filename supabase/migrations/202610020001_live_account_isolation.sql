-- Run once AFTER 202610010002_annual_advance.sql.
-- public remains the Sandbox. No existing records are deleted or updated.
-- This is a versioned snapshot: later account migrations must also update bazi_live.
begin;
create schema bazi_live;
revoke all on schema bazi_live from public, anon, authenticated;

do $$
declare
  table_name text;
  constraint_row record;
  routine_row record;
  definition text;
  copied integer := 0;
begin
  foreach table_name in array array['app_users','birth_profiles','user_entitlements',
    'comparison_reports','billing_customers','billing_orders','billing_payments'] loop
    execute format('create table bazi_live.%I (like public.%I including all)', table_name, table_name);
    execute format('alter table bazi_live.%I enable row level security', table_name);
  end loop;

  -- LIKE does not copy foreign keys. Deparse with a catalog-only search path so
  -- references are qualified, then point every application FK at the Live schema.
  perform set_config('search_path', 'pg_catalog', true);
  for constraint_row in
    select c.conname, t.relname, pg_get_constraintdef(c.oid) as definition
    from pg_constraint c join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and c.contype='f'
      and t.relname in ('app_users','birth_profiles','user_entitlements',
        'comparison_reports','billing_customers','billing_orders','billing_payments')
  loop
    execute format('alter table bazi_live.%I add constraint %I %s',
      constraint_row.relname, constraint_row.conname,
      replace(constraint_row.definition, 'public.', 'bazi_live.'));
  end loop;

  -- Reuse the verified account/payment rules, not their Sandbox data.
  for routine_row in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'save_birth_profile','reserve_comparison_report','reserve_comparison_report_v2',
      'guard_comparison_result_version','reserve_billing_order','reserve_billing_order_v2',
      'apply_billing_payment','apply_promptpay_payment','activate_annual_membership',
      'apply_annual_advance_payment')
  loop
    definition := replace(pg_get_functiondef(routine_row.oid), 'public.', 'bazi_live.');
    definition := regexp_replace(definition, 'SET search_path TO [^\n]+',
      'SET search_path TO ''bazi_live'', ''pg_catalog''');
    if position('public.' in definition)>0 then raise exception 'unisolated_function'; end if;
    execute definition;
    copied := copied+1;
  end loop;
  if copied<>10 then raise exception 'expected_10_account_functions_found_%', copied; end if;
end;
$$;

create trigger comparison_result_version_guard
  before update of result_json on bazi_live.comparison_reports
  for each row execute function bazi_live.guard_comparison_result_version();

create function bazi_live.refresh_account_entitlement(p_user_id uuid)
returns jsonb language plpgsql security definer
set search_path = bazi_live, pg_catalog as $$
declare e bazi_live.user_entitlements%rowtype;
  current_period date := date_trunc('month', now() at time zone 'Asia/Bangkok')::date;
begin
  select * into e from bazi_live.user_entitlements where user_id=p_user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  perform bazi_live.activate_annual_membership(p_user_id);
  select * into e from bazi_live.user_entitlements where user_id=p_user_id;
  if e.plan_id='premium' and (e.premium_expires_at is null or e.premium_expires_at<=now()) then
    update bazi_live.user_entitlements set plan_id='free', premium_started_at=null,
      premium_expires_at=null, updated_at=now() where user_id=p_user_id returning * into e;
  end if;
  if e.plan_id='premium' and e.comparison_period_start<>current_period then
    update bazi_live.user_entitlements set included_comparison_used=0,
      comparison_period_start=current_period, updated_at=now()
      where user_id=p_user_id returning * into e;
  end if;
  return to_jsonb(e);
end;
$$;

-- Preserve identity and birth details (including the 30-day edit cooldown).
-- Do NOT import Premium, credits, payment history, pending orders or test reports.
insert into bazi_live.app_users select * from public.app_users;
insert into bazi_live.birth_profiles select * from public.birth_profiles;
insert into bazi_live.user_entitlements(user_id) select id from bazi_live.app_users;

revoke all on all tables in schema bazi_live from public, anon, authenticated;
revoke all on all functions in schema bazi_live from public, anon, authenticated;
grant usage on schema bazi_live to service_role;
grant all on all tables in schema bazi_live to service_role;
grant execute on all functions in schema bazi_live to service_role;
alter default privileges in schema bazi_live revoke execute on functions from public;
notify pgrst, 'reload schema';
commit;
