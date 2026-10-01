-- Add one-time PromptPay membership without changing card subscription pricing.
begin;
alter table public.billing_orders add column if not exists payment_method text not null default 'card'
  check (payment_method in ('card', 'promptpay'));
alter table public.billing_payments add column if not exists payment_method text not null default 'card'
  check (payment_method in ('card', 'promptpay'));
alter table public.user_entitlements add column if not exists billing_payment_method text not null default 'card'
  check (billing_payment_method in ('card', 'promptpay'));

create or replace function public.reserve_billing_order_v2(p_user_id uuid, p_product text, p_payment_method text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order public.billing_orders%rowtype; v_ent public.user_entitlements%rowtype;
begin
  if p_product not in ('monthly', 'yearly', 'comparison') or p_payment_method not in ('card', 'promptpay') then raise exception 'invalid_product'; end if;
  select * into v_ent from public.user_entitlements where user_id = p_user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  if p_product <> 'comparison' and v_ent.plan_id = 'premium' and v_ent.premium_expires_at > now()
    and not (p_payment_method = 'promptpay' and v_ent.billing_payment_method = 'promptpay' and v_ent.billing_cycle = p_product)
    then raise exception 'active_membership_conflict'; end if;
  select * into v_order from public.billing_orders
    where user_id = p_user_id and status = 'pending' and created_at > now() - interval '65 minutes'
    and ((product = 'comparison') = (p_product = 'comparison'))
    order by created_at desc limit 1;
  if not found then
    insert into public.billing_orders(user_id, product, payment_method) values (p_user_id, p_product, p_payment_method) returning * into v_order;
  end if;
  return to_jsonb(v_order);
end;
$$;

create or replace function public.reserve_billing_order(p_user_id uuid, p_product text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin return public.reserve_billing_order_v2(p_user_id, p_product, 'card'); end;
$$;

create or replace function public.apply_promptpay_payment(
  p_payment_id text, p_order_id uuid, p_customer_id text, p_product text, p_amount integer
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order public.billing_orders%rowtype; v_ent public.user_entitlements%rowtype;
  v_count integer; v_until timestamptz; v_base timestamptz;
begin
  select * into v_order from public.billing_orders where id = p_order_id;
  if not found then raise exception 'order_not_found'; end if;
  select * into v_ent from public.user_entitlements where user_id = v_order.user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  select * into v_order from public.billing_orders where id = p_order_id for update;
  if v_order.payment_method <> 'promptpay' or v_order.product <> p_product or not exists (
    select 1 from public.billing_customers where user_id = v_order.user_id and stripe_customer_id = p_customer_id
  ) then raise exception 'payment_owner_mismatch'; end if;
  if p_payment_id not like 'cs_%' or p_amount <> (case p_product when 'monthly' then 14900 when 'yearly' then 99900 when 'comparison' then 5900 else -1 end)
    then raise exception 'payment_amount_mismatch'; end if;
  if v_order.status = 'paid' or exists(select 1 from public.billing_payments where id = p_payment_id)
    then return jsonb_build_object('duplicate', true); end if;
  if p_product <> 'comparison' then
    if v_ent.plan_id = 'premium' and v_ent.premium_expires_at > now()
      and (v_ent.billing_payment_method <> 'promptpay' or v_ent.billing_cycle <> p_product)
      then raise exception 'active_membership_conflict'; end if;
    v_base := greatest(now(), coalesce(v_ent.premium_expires_at, now()));
    v_until := ((v_base at time zone 'Asia/Bangkok') + case p_product when 'monthly' then interval '1 month' else interval '1 year' end) at time zone 'Asia/Bangkok';
  end if;
  insert into public.billing_payments(id, order_id, user_id, product, amount, paid_until, payment_method)
    values(p_payment_id, p_order_id, v_order.user_id, p_product, p_amount, v_until, 'promptpay') on conflict(id) do nothing;
  get diagnostics v_count = row_count;
  if v_count = 0 then return jsonb_build_object('duplicate', true); end if;
  if p_product = 'comparison' then
    update public.user_entitlements set purchased_comparison_credits = purchased_comparison_credits + 5, updated_at = now() where user_id = v_order.user_id;
  else
    update public.user_entitlements set plan_id = 'premium', billing_cycle = p_product, billing_payment_method = 'promptpay',
      premium_started_at = case when v_ent.premium_expires_at > now() then coalesce(premium_started_at, now()) else now() end,
      premium_expires_at = v_until, updated_at = now() where user_id = v_order.user_id;
  end if;
  update public.billing_orders set status = 'paid' where id = p_order_id;
  return jsonb_build_object('applied', true, 'paidUntil', v_until);
end;
$$;

-- Existing card webhook remains atomic; also mark the funded membership's channel.
create or replace function public.apply_billing_payment(
  p_payment_id text, p_order_id uuid, p_customer_id text, p_subscription_id text,
  p_product text, p_amount integer, p_paid_until timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order public.billing_orders%rowtype; v_ent public.user_entitlements%rowtype; v_count integer;
begin
  select * into v_order from public.billing_orders where id = p_order_id;
  if not found then raise exception 'order_not_found'; end if;
  select * into v_ent from public.user_entitlements where user_id = v_order.user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  select * into v_order from public.billing_orders where id = p_order_id for update;
  if v_order.payment_method <> 'card' or not exists(select 1 from public.billing_customers where user_id = v_order.user_id and stripe_customer_id = p_customer_id)
    or v_order.product <> p_product then raise exception 'payment_owner_mismatch'; end if;
  if p_amount <> (case p_product when 'monthly' then 14900 when 'yearly' then 99900 when 'comparison' then 5900 else -1 end)
    then raise exception 'payment_amount_mismatch'; end if;
  if p_product = 'comparison' then
    if p_payment_id not like 'cs_%' or p_subscription_id is not null then raise exception 'invalid_credit_payment'; end if;
    if v_order.status = 'paid' then return jsonb_build_object('duplicate', true); end if;
  else
    if p_payment_id not like 'in_%' or p_subscription_id is null or p_subscription_id not like 'sub_%' or p_paid_until is null then raise exception 'invalid_subscription_payment'; end if;
    if v_order.stripe_subscription_id is not null and v_order.stripe_subscription_id <> p_subscription_id then raise exception 'subscription_mismatch'; end if;
  end if;
  insert into public.billing_payments(id, order_id, user_id, product, amount, paid_until, payment_method)
    values(p_payment_id, p_order_id, v_order.user_id, p_product, p_amount, p_paid_until, 'card') on conflict(id) do nothing;
  get diagnostics v_count = row_count;
  if v_count = 0 then return jsonb_build_object('duplicate', true); end if;
  if p_product = 'comparison' then
    update public.user_entitlements set purchased_comparison_credits = purchased_comparison_credits + 5, updated_at = now() where user_id = v_order.user_id;
  elsif p_paid_until > now() and (v_ent.premium_expires_at is null or p_paid_until > v_ent.premium_expires_at) then
    update public.user_entitlements set plan_id = 'premium', billing_cycle = p_product, billing_payment_method = 'card',
      premium_started_at = coalesce(premium_started_at, now()), premium_expires_at = p_paid_until, updated_at = now() where user_id = v_order.user_id;
  end if;
  update public.billing_orders set status = 'paid', stripe_subscription_id = p_subscription_id where id = p_order_id;
  return jsonb_build_object('applied', true);
end;
$$;
revoke all on function public.reserve_billing_order_v2(uuid,text,text) from public, anon, authenticated;
revoke all on function public.apply_promptpay_payment(text,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.reserve_billing_order_v2(uuid,text,text) to service_role;
grant execute on function public.apply_promptpay_payment(text,uuid,text,text,integer) to service_role;
commit;
