-- Existing Premium records default to monthly; do not infer annual purchases.
alter table public.user_entitlements
  add column if not exists billing_cycle text not null default 'monthly'
  check (billing_cycle in ('monthly', 'yearly'));
