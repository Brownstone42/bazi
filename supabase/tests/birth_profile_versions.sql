-- Run in a migrated test database. All data is rolled back.
begin;
do $$
declare
  u uuid := gen_random_uuid();
  r jsonb;
  p public.birth_profiles%rowtype;
  q record;
  old_id uuid;
  old_result jsonb;
begin
  insert into public.app_users(id,line_user_id,display_name) values(u,'test-'||u,'test');
  insert into public.user_entitlements(user_id,purchased_comparison_credits) values(u,5);
  r := public.save_birth_profile(u,'1989-08-26','11:30','male','Asia/Bangkok');
  select * into p from public.birth_profiles where user_id=u;
  if p.profile_version <> 1 or p.last_birth_edit_at is not null then raise exception 'onboarding consumed edit'; end if;
  select * into q from public.reserve_comparison_report_v2(u,1,'same','person','1992-04-02','18:55','female','Asia/Bangkok','unspecified','overview');
  old_id := q.report_id;
  update public.comparison_reports set result_json='{"summary":"original"}' where id=old_id;
  r := public.save_birth_profile(u,'1989-08-26','11:30','male','Asia/Bangkok');
  if (select last_birth_edit_at from public.birth_profiles where user_id=u) is not null then raise exception 'no-op consumed edit'; end if;
  r := public.save_birth_profile(u,'1989-08-27','11:30','male','Asia/Bangkok');
  if not (r->>'allowed')::boolean then raise exception 'first edit denied'; end if;
  r := public.save_birth_profile(u,'1989-08-28','11:30','male','Asia/Bangkok');
  if (r->>'allowed')::boolean then raise exception 'second edit allowed'; end if;
  r := public.save_birth_profile(u,'1989-08-27','11:30','male','Asia/Bangkok');
  if not (r->>'allowed')::boolean then raise exception 'same data denied'; end if;
  if (select profile_version from public.birth_profiles where user_id=u) <> 2 then raise exception 'bad version'; end if;
  begin
    perform * from public.reserve_comparison_report_v2(u,1,'same','person','1992-04-02','18:55','female','Asia/Bangkok','unspecified','overview');
    raise exception 'stale reservation was accepted';
  exception when others then
    if sqlerrm <> 'profile_version_changed' then raise; end if;
  end;
  begin
    update public.comparison_reports set result_json='{"summary":"overwrite"}' where id=old_id;
    raise exception 'old result overwrite was accepted';
  exception when others then
    if sqlerrm <> 'profile_version_changed' then raise; end if;
  end;
  select * into q from public.reserve_comparison_report_v2(u,2,'same','person','1992-04-02','18:55','female','Asia/Bangkok','unspecified','overview');
  if q.report_id = old_id or q.is_existing or q.source <> 'purchased' then raise exception 'new version did not consume quota'; end if;
  if (select purchased_comparison_credits from public.user_entitlements where user_id=u) <> 4 then raise exception 'credits changed incorrectly'; end if;
  select * into q from public.reserve_comparison_report_v2(u,2,'same','person','1992-04-02','18:55','female','Asia/Bangkok','unspecified','overview');
  if not q.is_existing then raise exception 'repeat should reuse current report'; end if;
  update public.birth_profiles set last_birth_edit_at=now()-interval '720 hours' where user_id=u;
  r := public.save_birth_profile(u,'1989-08-26','11:30','male','Asia/Bangkok');
  if not (r->>'allowed')::boolean or (select profile_version from public.birth_profiles where user_id=u) <> 3 then raise exception '30 day boundary failed'; end if;
  select result_json into old_result from public.comparison_reports where id=old_id;
  if old_result->>'summary' <> 'original' then raise exception 'history changed'; end if;
  if (select owner_profile_version from public.comparison_reports where id=old_id) <> 1 then raise exception 'old version changed'; end if;
end;
$$;
rollback;
