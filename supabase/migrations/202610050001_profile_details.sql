-- Optional self-declared profile information. Does not alter birth profiles, quotas or billing.
begin;
alter table public.app_users add column if not exists profile_details jsonb not null default '{}'::jsonb;
alter table bazi_live.app_users add column if not exists profile_details jsonb not null default '{}'::jsonb;
alter table public.birth_profiles alter column birth_time drop not null;
alter table bazi_live.birth_profiles alter column birth_time drop not null;
alter table public.birth_profiles drop constraint if exists birth_profiles_gender_check;
alter table bazi_live.birth_profiles drop constraint if exists birth_profiles_gender_check;
alter table public.birth_profiles add constraint birth_profiles_gender_check check (gender in ('male', 'female', 'unspecified'));
alter table bazi_live.birth_profiles add constraint birth_profiles_gender_check check (gender in ('male', 'female', 'unspecified'));
comment on column public.app_users.profile_details is 'Optional blood type with explicit consent, and relationship status; not used for natal calculations';
comment on column bazi_live.app_users.profile_details is 'Optional blood type with explicit consent, and relationship status; not used for natal calculations';
commit;
