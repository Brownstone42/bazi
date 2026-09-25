create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null unique,
  display_name text not null,
  picture_url text,
  last_login_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_entitlements (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  plan_id text not null default 'free' check (plan_id in ('free', 'premium')),
  premium_started_at timestamptz,
  premium_expires_at timestamptz,
  free_comparison_used boolean not null default false,
  included_comparison_used integer not null default 0 check (included_comparison_used >= 0),
  comparison_period_start date not null default date_trunc('month', now())::date,
  purchased_comparison_credits integer not null default 0 check (purchased_comparison_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.birth_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  birth_date date not null,
  birth_time time not null,
  gender text not null check (gender in ('male', 'female')),
  timezone_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.birth_profiles enable row level security;

revoke all on public.app_users from anon, authenticated;
revoke all on public.user_entitlements from anon, authenticated;
revoke all on public.birth_profiles from anon, authenticated;

grant all on public.app_users to service_role;
grant all on public.user_entitlements to service_role;
grant all on public.birth_profiles to service_role;

comment on table public.app_users is 'บัญชีภายในที่สร้างหลังตรวจ LINE ID token ฝั่งเซิร์ฟเวอร์';
comment on table public.user_entitlements is 'สถานะสมาชิกและโควต้าที่แก้ไขผ่าน backend เท่านั้น';
comment on table public.birth_profiles is 'ข้อมูลเกิดหลักหนึ่งชุดต่อหนึ่งบัญชี';
