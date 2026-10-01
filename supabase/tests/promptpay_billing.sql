-- Synthetic fixture only. All writes rolled back; run after PromptPay migration.
begin;
do $$
declare u uuid := gen_random_uuid(); o jsonb; r jsonb; ent public.user_entitlements%rowtype; expiry timestamptz;
begin
  insert into public.app_users(id,line_user_id,display_name) values(u,'promptpay-test-' || u::text,'PromptPay SQL test');
  insert into public.user_entitlements(user_id,included_comparison_used,purchased_comparison_credits) values(u,3,5);
  insert into public.billing_customers(user_id,stripe_customer_id) values(u,'cus_pp_sql_' || u::text);
  o := public.reserve_billing_order_v2(u,'monthly','promptpay');
  perform public.apply_promptpay_payment('cs_pp_month_' || u::text,(o->>'id')::uuid,'cus_pp_sql_' || u::text,'monthly',14900);
  select * into ent from public.user_entitlements where user_id=u;
  assert ent.plan_id='premium' and ent.billing_cycle='monthly' and ent.billing_payment_method='promptpay', 'monthly method and plan';
  assert ent.premium_expires_at > now()+interval '27 days', 'one calendar month';
  expiry := ent.premium_expires_at;
  r := public.apply_promptpay_payment('cs_pp_month_' || u::text,(o->>'id')::uuid,'cus_pp_sql_' || u::text,'monthly',14900);
  assert r->>'duplicate'='true', 'duplicate recognized';
  select * into ent from public.user_entitlements where user_id=u;
  assert ent.premium_expires_at=expiry, 'duplicate must not extend expiry';
  o := public.reserve_billing_order_v2(u,'monthly','promptpay');
  perform public.apply_promptpay_payment('cs_pp_extend_' || u::text,(o->>'id')::uuid,'cus_pp_sql_' || u::text,'monthly',14900);
  select * into ent from public.user_entitlements where user_id=u;
  assert ent.premium_expires_at=((expiry at time zone 'Asia/Bangkok')+interval '1 month') at time zone 'Asia/Bangkok', 'extension from existing expiry';
  assert ent.included_comparison_used=3 and ent.purchased_comparison_credits=5, 'payment preserves usage and credits';
  begin
    perform public.reserve_billing_order_v2(u,'monthly','card');
    raise exception 'expected active membership conflict';
  exception when others then if sqlerrm <> 'active_membership_conflict' then raise; end if; end;
  o := public.reserve_billing_order_v2(u,'comparison','promptpay');
  begin
    perform public.apply_promptpay_payment('cs_pp_wrong_' || u::text,(o->>'id')::uuid,'cus_other','comparison',5900);
    raise exception 'expected owner mismatch';
  exception when others then if sqlerrm <> 'payment_owner_mismatch' then raise; end if; end;
  perform public.apply_promptpay_payment('cs_pp_credit_' || u::text,(o->>'id')::uuid,'cus_pp_sql_' || u::text,'comparison',5900);
  perform public.apply_promptpay_payment('cs_pp_credit_' || u::text,(o->>'id')::uuid,'cus_pp_sql_' || u::text,'comparison',5900);
  select * into ent from public.user_entitlements where user_id=u;
  assert ent.purchased_comparison_credits=10, 'credit duplicate grants once';
  update public.user_entitlements set premium_expires_at=now()-interval '1 day' where user_id=u;
  o := public.reserve_billing_order_v2(u,'yearly','promptpay');
  perform public.apply_promptpay_payment('cs_pp_year_' || u::text,(o->>'id')::uuid,'cus_pp_sql_' || u::text,'yearly',99900);
  select * into ent from public.user_entitlements where user_id=u;
  assert ent.billing_cycle='yearly' and ent.premium_expires_at > now()+interval '364 days', 'one calendar year from payment';
end;
$$;
rollback;
