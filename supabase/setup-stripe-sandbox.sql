-- One-time setup bundle for the existing Bazi database. No data deletion.
-- Requires the initial accounts and comparison quota migrations.
-- If any statement fails, this transaction rolls back all changes.
begin;

-- Source: supabase/migrations/202609280001_birth_profile_versions.sql
-- Run after the account and comparison quota migrations. No quota is refunded.
alter table public.birth_profiles
  add column if not exists profile_version integer not null default 1,
  add column if not exists last_birth_edit_at timestamptz;
alter table public.comparison_reports
  add column if not exists owner_profile_version integer,
  add column if not exists owner_birth_snapshot jsonb;
-- Legacy reports deliberately remain NULL: their original inputs are unknown.

create or replace function public.save_birth_profile(
  p_user_id uuid, p_birth_date date, p_birth_time time, p_gender text, p_timezone_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile public.birth_profiles%rowtype;
begin
  -- Same lock as reservation: edits and new reports cannot race.
  perform 1 from public.app_users where id = p_user_id for update;
  if not found then raise exception 'user_not_found'; end if;
  select * into v_profile from public.birth_profiles where user_id = p_user_id for update;
  if not found then
    insert into public.birth_profiles(user_id, birth_date, birth_time, gender, timezone_id)
      values (p_user_id, p_birth_date, p_birth_time, p_gender, p_timezone_id)
      returning * into v_profile;
  elsif row(v_profile.birth_date, v_profile.birth_time, v_profile.gender, v_profile.timezone_id)
    is distinct from row(p_birth_date, p_birth_time, p_gender, p_timezone_id) then
    if v_profile.last_birth_edit_at is not null
      and now() < v_profile.last_birth_edit_at + interval '720 hours' then
      return jsonb_build_object('allowed', false, 'nextEditAt', v_profile.last_birth_edit_at + interval '720 hours');
    end if;
    update public.birth_profiles set birth_date = p_birth_date, birth_time = p_birth_time,
      gender = p_gender, timezone_id = p_timezone_id, profile_version = profile_version + 1,
      last_birth_edit_at = now(), updated_at = now()
      where user_id = p_user_id returning * into v_profile;
  end if;
  return jsonb_build_object('allowed', true, 'profile', to_jsonb(v_profile));
end;
$$;
revoke all on function public.save_birth_profile(uuid,date,time,text,text) from public, anon, authenticated;
grant execute on function public.save_birth_profile(uuid,date,time,text,text) to service_role;

create or replace function public.reserve_comparison_report_v2(
  p_user_id uuid, p_expected_version integer, p_fingerprint text, p_person_name text,
  p_birth_date date, p_birth_time time, p_gender text, p_timezone_id text,
  p_relationship text, p_focus text
) returns table(report_id uuid, is_existing boolean, source text, current_plan text,
  included_used integer, purchased_remaining integer, free_used boolean, saved_result jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.birth_profiles%rowtype;
  v_reservation record;
begin
  perform 1 from public.app_users where id = p_user_id for update;
  select * into v_profile from public.birth_profiles where user_id = p_user_id;
  if not found then raise exception 'birth_profile_required'; end if;
  if p_expected_version is null or p_expected_version <> v_profile.profile_version then
    raise exception 'profile_version_changed';
  end if;
  for v_reservation in select * from public.reserve_comparison_report(
    p_user_id, 'v' || v_profile.profile_version || ':' || p_fingerprint, p_person_name,
    p_birth_date, p_birth_time, p_gender, p_timezone_id, p_relationship, p_focus
  ) loop
    if v_reservation.report_id is not null and not v_reservation.is_existing then
      update public.comparison_reports set owner_profile_version = v_profile.profile_version,
        owner_birth_snapshot = jsonb_build_object('birth_date', v_profile.birth_date,
          'birth_time', v_profile.birth_time, 'gender', v_profile.gender, 'timezone_id', v_profile.timezone_id)
        where id = v_reservation.report_id;
    end if;
    return query select v_reservation.report_id, v_reservation.is_existing, v_reservation.source,
      v_reservation.current_plan, v_reservation.included_used, v_reservation.purchased_remaining,
      v_reservation.free_used, v_reservation.saved_result;
  end loop;
end;
$$;
revoke all on function public.reserve_comparison_report_v2(uuid,integer,text,text,date,time,text,text,text,text) from public, anon, authenticated;
grant execute on function public.reserve_comparison_report_v2(uuid,integer,text,text,date,time,text,text,text,text) to service_role;

create or replace function public.guard_comparison_result_version()
returns trigger language plpgsql set search_path = public as $$
declare v_version integer;
begin
  if new.result_json is distinct from old.result_json then
    perform 1 from public.app_users where id = new.user_id for update;
    select profile_version into v_version from public.birth_profiles where user_id = new.user_id;
    if new.owner_profile_version is null or new.owner_profile_version is distinct from v_version then
      raise exception 'profile_version_changed';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists comparison_result_version_guard on public.comparison_reports;
create trigger comparison_result_version_guard before update of result_json on public.comparison_reports
  for each row execute function public.guard_comparison_result_version();


-- Source: supabase/migrations/202609280002_subscription_billing_cycle.sql
-- Existing Premium records default to monthly; do not infer annual purchases.
alter table public.user_entitlements
  add column if not exists billing_cycle text not null default 'monthly'
  check (billing_cycle in ('monthly', 'yearly'));


-- Source: supabase/migrations/202609280003_annual_comparison_quota.sql
-- Requires 202609280002_subscription_billing_cycle.sql. Preserve usage and credits.
create or replace function public.reserve_comparison_report(
  p_user_id uuid,
  p_fingerprint text,
  p_person_name text,
  p_birth_date date,
  p_birth_time time,
  p_gender text,
  p_timezone_id text,
  p_relationship text,
  p_focus text
)
returns table (
  report_id uuid,
  is_existing boolean,
  source text,
  current_plan text,
  included_used integer,
  purchased_remaining integer,
  free_used boolean,
  saved_result jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlement public.user_entitlements%rowtype;
  v_report public.comparison_reports%rowtype;
  v_source text;
  v_period date := date_trunc('month', now() at time zone 'Asia/Bangkok')::date;
begin
  select * into v_report
  from public.comparison_reports r
  where r.user_id = p_user_id and r.fingerprint = p_fingerprint;

  if found then
    select * into v_entitlement from public.user_entitlements e where e.user_id = p_user_id;
    return query select v_report.id, true, v_report.quota_source, v_entitlement.plan_id,
      case when v_entitlement.plan_id = 'premium' then v_entitlement.included_comparison_used
           when v_entitlement.free_comparison_used then 1 else 0 end,
      v_entitlement.purchased_comparison_credits, v_entitlement.free_comparison_used, v_report.result_json;
    return;
  end if;

  select * into v_entitlement
  from public.user_entitlements e
  where e.user_id = p_user_id
  for update;

  if not found then raise exception 'entitlement_not_found'; end if;

  select * into v_report
  from public.comparison_reports r
  where r.user_id = p_user_id and r.fingerprint = p_fingerprint;
  if found then
    return query select v_report.id, true, v_report.quota_source, v_entitlement.plan_id,
      case when v_entitlement.plan_id = 'premium' then v_entitlement.included_comparison_used
           when v_entitlement.free_comparison_used then 1 else 0 end,
      v_entitlement.purchased_comparison_credits, v_entitlement.free_comparison_used, v_report.result_json;
    return;
  end if;

  if v_entitlement.plan_id = 'premium'
     and v_entitlement.premium_expires_at is not null
     and v_entitlement.premium_expires_at <= now() then
    update public.user_entitlements
      set plan_id = 'free', premium_started_at = null, premium_expires_at = null, updated_at = now()
      where user_id = p_user_id
      returning * into v_entitlement;
  end if;

  if v_entitlement.plan_id = 'premium' and v_entitlement.comparison_period_start <> v_period then
    update public.user_entitlements
      set included_comparison_used = 0, comparison_period_start = v_period, updated_at = now()
      where user_id = p_user_id
      returning * into v_entitlement;
  end if;

  if v_entitlement.plan_id = 'premium' and v_entitlement.included_comparison_used < (case when v_entitlement.billing_cycle = 'yearly' then 10 else 5 end) then
    v_source := 'premium';
    update public.user_entitlements
      set included_comparison_used = included_comparison_used + 1, updated_at = now()
      where user_id = p_user_id
      returning * into v_entitlement;
  elsif v_entitlement.plan_id = 'free' and not v_entitlement.free_comparison_used then
    v_source := 'free';
    update public.user_entitlements
      set free_comparison_used = true, updated_at = now()
      where user_id = p_user_id
      returning * into v_entitlement;
  elsif v_entitlement.purchased_comparison_credits > 0 then
    v_source := 'purchased';
    update public.user_entitlements
      set purchased_comparison_credits = purchased_comparison_credits - 1, updated_at = now()
      where user_id = p_user_id
      returning * into v_entitlement;
  else
    return query select null::uuid, false, 'none'::text, v_entitlement.plan_id,
      case when v_entitlement.plan_id = 'premium' then v_entitlement.included_comparison_used
           when v_entitlement.free_comparison_used then 1 else 0 end,
      v_entitlement.purchased_comparison_credits, v_entitlement.free_comparison_used, null::jsonb;
    return;
  end if;

  insert into public.comparison_reports (
    user_id, fingerprint, person_name, birth_date, birth_time, gender,
    timezone_id, relationship, focus, quota_source
  ) values (
    p_user_id, p_fingerprint, p_person_name, p_birth_date, p_birth_time, p_gender,
    p_timezone_id, p_relationship, p_focus, v_source
  ) returning * into v_report;

  return query select v_report.id, false, v_source, v_entitlement.plan_id,
    case when v_entitlement.plan_id = 'premium' then v_entitlement.included_comparison_used
         when v_entitlement.free_comparison_used then 1 else 0 end,
    v_entitlement.purchased_comparison_credits, v_entitlement.free_comparison_used, null::jsonb;
end;
$$;

revoke all on function public.reserve_comparison_report(uuid, text, text, date, time, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.reserve_comparison_report(uuid, text, text, date, time, text, text, text, text)
  to service_role;

comment on table public.comparison_reports is 'รายการเปรียบเทียบที่เปิดซ้ำได้โดยไม่ตัดโควต้า';
comment on function public.reserve_comparison_report is 'จองสิทธิ์แบบ atomic โดยใช้ Free หรือ Premium ก่อนเครดิตซื้อเพิ่ม';



-- Source: supabase/migrations/202609280004_stripe_test_billing.sql
-- Test billing foundation. Apply after 202609280003; no live payments enabled.
create table public.billing_customers (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  stripe_customer_id text not null unique
);
create table public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id),
  product text not null check (product in ('monthly', 'yearly', 'comparison')),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);
create table public.billing_payments (
  id text primary key,
  order_id uuid not null references public.billing_orders(id),
  user_id uuid not null references public.app_users(id),
  product text not null,
  amount integer not null,
  paid_until timestamptz,
  created_at timestamptz not null default now()
);
create index on public.billing_orders(user_id, created_at desc);
create index on public.billing_payments(user_id, created_at desc);
alter table public.billing_customers enable row level security;
alter table public.billing_orders enable row level security;
alter table public.billing_payments enable row level security;
revoke all on public.billing_customers, public.billing_orders, public.billing_payments from anon, authenticated;
grant all on public.billing_customers, public.billing_orders, public.billing_payments to service_role;

create or replace function public.reserve_billing_order(p_user_id uuid, p_product text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order public.billing_orders%rowtype;
begin
  if p_product not in ('monthly', 'yearly', 'comparison') then raise exception 'invalid_product'; end if;
  perform 1 from public.user_entitlements where user_id = p_user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  select * into v_order from public.billing_orders
    where user_id = p_user_id and status = 'pending' and created_at > now() - interval '65 minutes'
    and ((product = 'comparison') = (p_product = 'comparison'))
    order by created_at desc limit 1;
  if not found then
    insert into public.billing_orders(user_id, product) values (p_user_id, p_product) returning * into v_order;
  end if;
  return to_jsonb(v_order);
end;
$$;

create or replace function public.apply_billing_payment(
  p_payment_id text, p_order_id uuid, p_customer_id text, p_subscription_id text,
  p_product text, p_amount integer, p_paid_until timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order public.billing_orders%rowtype;
  v_ent public.user_entitlements%rowtype;
  v_count integer;
begin
  select * into v_order from public.billing_orders where id = p_order_id;
  if not found then raise exception 'order_not_found'; end if;
  select * into v_ent from public.user_entitlements where user_id = v_order.user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  select * into v_order from public.billing_orders where id = p_order_id for update;
  if not exists (select 1 from public.billing_customers where user_id = v_order.user_id and stripe_customer_id = p_customer_id)
    or v_order.product <> p_product then raise exception 'payment_owner_mismatch'; end if;
  if p_amount <> (case p_product when 'monthly' then 14900 when 'yearly' then 99900 when 'comparison' then 5900 else -1 end)
    then raise exception 'payment_amount_mismatch'; end if;
  if p_product = 'comparison' then
    if p_payment_id not like 'cs_%' or p_subscription_id is not null then raise exception 'invalid_credit_payment'; end if;
    if v_order.status = 'paid' then return jsonb_build_object('duplicate', true); end if;
  else
    if p_payment_id not like 'in_%' or p_subscription_id is null or p_subscription_id not like 'sub_%'
      or p_paid_until is null then raise exception 'invalid_subscription_payment'; end if;
    if v_order.stripe_subscription_id is not null and v_order.stripe_subscription_id <> p_subscription_id
      then raise exception 'subscription_mismatch'; end if;
  end if;
  insert into public.billing_payments(id, order_id, user_id, product, amount, paid_until)
    values (p_payment_id, p_order_id, v_order.user_id, p_product, p_amount, p_paid_until)
    on conflict (id) do nothing;
  get diagnostics v_count = row_count;
  if v_count = 0 then return jsonb_build_object('duplicate', true); end if;
  if p_product = 'comparison' then
    update public.user_entitlements set purchased_comparison_credits = purchased_comparison_credits + 5, updated_at = now()
      where user_id = v_order.user_id;
  elsif p_paid_until > now() and (v_ent.premium_expires_at is null or p_paid_until > v_ent.premium_expires_at) then
    update public.user_entitlements set plan_id = 'premium', billing_cycle = p_product,
      premium_started_at = coalesce(premium_started_at, now()), premium_expires_at = p_paid_until,
      -- Never reset usage on payment/renewal. Only the calendar-month reset does that.
      updated_at = now() where user_id = v_order.user_id;
  end if;
  update public.billing_orders set status = 'paid', stripe_subscription_id = p_subscription_id where id = p_order_id;
  return jsonb_build_object('applied', true);
end;
$$;
revoke all on function public.reserve_billing_order(uuid, text) from public, anon, authenticated;
revoke all on function public.apply_billing_payment(text, uuid, text, text, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_billing_order(uuid, text) to service_role;
grant execute on function public.apply_billing_payment(text, uuid, text, text, text, integer, timestamptz) to service_role;


commit;
