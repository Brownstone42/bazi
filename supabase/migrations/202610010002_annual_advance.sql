-- Paid annual membership queued after an existing monthly period. No records deleted.
begin;
alter table public.billing_orders add column if not exists advance_starts_at timestamptz;
alter table public.billing_orders add column if not exists advance_expires_at timestamptz;
alter table public.billing_orders add column if not exists replaces_subscription_id text;
alter table public.user_entitlements add column if not exists next_membership jsonb;

create or replace function public.activate_annual_membership(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e public.user_entitlements%rowtype; n jsonb;
begin
  select * into e from public.user_entitlements where user_id=p_user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  n := e.next_membership;
  if n is not null and (n->>'startsAt')::timestamptz <= now() then
    update public.user_entitlements set plan_id='premium', billing_cycle='yearly',
      billing_payment_method=n->>'paymentMethod', premium_started_at=(n->>'startsAt')::timestamptz,
      premium_expires_at=(n->>'expiresAt')::timestamptz, next_membership=null, updated_at=now()
      where user_id=p_user_id returning * into e;
  end if;
  return to_jsonb(e);
end;
$$;

create or replace function public.reserve_billing_order_v2(p_user_id uuid, p_product text, p_payment_method text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.billing_orders%rowtype; e public.user_entitlements%rowtype; is_advance boolean; old_sub text;
begin
  if p_product is null or p_product not in ('monthly','yearly','comparison') or p_payment_method is null or p_payment_method not in ('card','promptpay') then raise exception 'invalid_product'; end if;
  perform public.activate_annual_membership(p_user_id);
  select * into e from public.user_entitlements where user_id=p_user_id for update;
  is_advance := p_product='yearly' and e.plan_id='premium' and e.billing_cycle='monthly' and e.premium_expires_at > now();
  if p_product <> 'comparison' and e.next_membership is not null then raise exception 'annual_already_queued'; end if;
  if p_product <> 'comparison' and e.plan_id='premium' and e.premium_expires_at > now()
    and not is_advance and not (p_payment_method='promptpay' and e.billing_payment_method='promptpay' and e.billing_cycle=p_product)
    then raise exception 'active_membership_conflict'; end if;
  select * into o from public.billing_orders where user_id=p_user_id and status='pending' and created_at > now()-interval '65 minutes'
    and ((product='comparison')=(p_product='comparison')) order by created_at desc limit 1;
  if not found then
    if is_advance and e.billing_payment_method='card' then
      select stripe_subscription_id into old_sub from public.billing_orders where user_id=p_user_id and product='monthly' and status='paid'
        and stripe_subscription_id is not null order by created_at desc limit 1;
      if old_sub is null then raise exception 'monthly_subscription_not_found'; end if;
    end if;
    insert into public.billing_orders(user_id,product,payment_method,advance_starts_at,advance_expires_at,replaces_subscription_id)
      values(p_user_id,p_product,p_payment_method,case when is_advance then e.premium_expires_at end,
        case when is_advance then ((e.premium_expires_at at time zone 'Asia/Bangkok')+interval '1 year') at time zone 'Asia/Bangkok' end,old_sub)
      returning * into o;
  end if;
  return to_jsonb(o);
end;
$$;

create or replace function public.apply_annual_advance_payment(p_payment_id text,p_order_id uuid,p_customer_id text,p_subscription_id text,p_amount integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.billing_orders%rowtype; e public.user_entitlements%rowtype; count_rows integer; n jsonb;
begin
  select * into o from public.billing_orders where id=p_order_id;
  if not found then raise exception 'order_not_found'; end if;
  select * into e from public.user_entitlements where user_id=o.user_id for update;
  select * into o from public.billing_orders where id=p_order_id for update;
  if o.product <> 'yearly' or o.advance_starts_at is null or o.advance_expires_at is null or not exists(
    select 1 from public.billing_customers where user_id=o.user_id and stripe_customer_id=p_customer_id)
    then raise exception 'payment_owner_mismatch'; end if;
  if p_amount <> 99900 or (o.payment_method='promptpay' and (p_payment_id not like 'cs_%' or p_subscription_id is not null))
    or (o.payment_method='card' and (p_payment_id not like 'in_%' or p_subscription_id is null or p_subscription_id not like 'sub_%'))
    then raise exception 'invalid_advance_payment'; end if;
  if o.status='paid' or exists(select 1 from public.billing_payments where id=p_payment_id) then return jsonb_build_object('duplicate',true); end if;
  if e.next_membership is not null then raise exception 'annual_already_queued'; end if;
  if e.billing_cycle <> 'monthly' or (e.premium_expires_at is not null and e.premium_expires_at <> o.advance_starts_at)
    then raise exception 'membership_period_changed'; end if;
  insert into public.billing_payments(id,order_id,user_id,product,amount,paid_until,payment_method)
    values(p_payment_id,p_order_id,o.user_id,'yearly',p_amount,o.advance_expires_at,o.payment_method) on conflict(id) do nothing;
  get diagnostics count_rows = row_count;
  if count_rows=0 then return jsonb_build_object('duplicate',true); end if;
  n := jsonb_build_object('billingCycle','yearly','startsAt',o.advance_starts_at,'expiresAt',o.advance_expires_at,'paymentMethod',o.payment_method,'orderId',o.id);
  update public.user_entitlements set next_membership=n,updated_at=now() where user_id=o.user_id;
  update public.billing_orders set status='paid',stripe_subscription_id=p_subscription_id where id=o.id;
  perform public.activate_annual_membership(o.user_id);
  return jsonb_build_object('applied',true,'nextMembership',n);
end;
$$;
revoke all on function public.activate_annual_membership(uuid) from public,anon,authenticated;
revoke all on function public.apply_annual_advance_payment(text,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.activate_annual_membership(uuid) to service_role;
grant execute on function public.apply_annual_advance_payment(text,uuid,text,text,integer) to service_role;
commit;
