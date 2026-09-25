create table if not exists public.comparison_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  fingerprint text not null,
  person_name text not null,
  birth_date date not null,
  birth_time time,
  gender text not null check (gender in ('male', 'female')),
  timezone_id text not null,
  relationship text not null,
  focus text not null,
  quota_source text not null check (quota_source in ('free', 'premium', 'purchased')),
  result_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create index if not exists comparison_reports_user_created_idx
  on public.comparison_reports (user_id, created_at desc);

alter table public.comparison_reports enable row level security;
revoke all on public.comparison_reports from anon, authenticated;
grant all on public.comparison_reports to service_role;

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

  if v_entitlement.plan_id = 'premium' and v_entitlement.included_comparison_used < 5 then
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
