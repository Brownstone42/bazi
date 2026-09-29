begin;
do $$
declare
  u uuid := gen_random_uuid();
  o jsonb;
  a jsonb;
  r jsonb;
  ent public.user_entitlements%rowtype;
begin
  insert into public.app_users(id,line_user_id,display_name) values(u,'billing-test-' || u::text,'Billing test');
  insert into public.user_entitlements(user_id,included_comparison_used) values(u,3);
  insert into public.billing_customers(user_id,stripe_customer_id) values(u,'cus_sql_test_' || u::text);
  o := public.reserve_billing_order(u,'comparison');
  a := public.reserve_billing_order(u,'comparison');
  assert o->>'id' = a->>'id', 'concurrent-style retry must reuse pending order';
  r := public.apply_billing_payment('cs_sql_' || u::text,(o->>'id')::uuid,'cus_sql_test_' || u::text,null,'comparison',5900,null);
  r := public.apply_billing_payment('cs_sql_' || u::text,(o->>'id')::uuid,'cus_sql_test_' || u::text,null,'comparison',5900,null);
  select * into ent from public.user_entitlements where user_id=u;
  assert ent.purchased_comparison_credits = 5, 'duplicate must not add credits';
  o := public.reserve_billing_order(u,'yearly');
  begin
    perform public.apply_billing_payment('in_wrong_' || u::text,(o->>'id')::uuid,'cus_wrong','sub_sql','yearly',99900,now()+interval '1 year');
    raise exception 'expected owner mismatch';
  exception when others then
    if sqlerrm <> 'payment_owner_mismatch' then raise; end if;
  end;
  perform public.apply_billing_payment('in_new_' || u::text,(o->>'id')::uuid,'cus_sql_test_' || u::text,'sub_sql','yearly',99900,now()+interval '1 year');
  perform public.apply_billing_payment('in_old_' || u::text,(o->>'id')::uuid,'cus_sql_test_' || u::text,'sub_sql','yearly',99900,now()+interval '1 month');
  select * into ent from public.user_entitlements where user_id=u;
  assert ent.plan_id = 'premium' and ent.billing_cycle = 'yearly', 'annual entitlement';
  assert ent.premium_expires_at > now()+interval '11 months', 'older invoice must not shorten expiry';
  assert ent.included_comparison_used = 3, 'payment must not reset quota';
  assert ent.purchased_comparison_credits = 5, 'subscription must preserve credits';
end;
$$;
rollback;

