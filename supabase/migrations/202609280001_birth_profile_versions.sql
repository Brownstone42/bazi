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
