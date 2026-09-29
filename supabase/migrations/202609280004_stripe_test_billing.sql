-- Test billing foundation. Apply after 202609280003; no live payments enabled.
create table public.billing_customers (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  stripe_customer_id text not null unique
);
create table public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id),
  product text not null check (product in ('monthly', 'yearly', 'comparison')),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);
create table public.billing_payments (
  id text primary key,
  order_id uuid not null references public.billing_orders(id),
  user_id uuid not null references public.app_users(id),
  product text not null,
  amount integer not null,
  paid_until timestamptz,
  created_at timestamptz not null default now()
);
create index on public.billing_orders(user_id, created_at desc);
create index on public.billing_payments(user_id, created_at desc);
alter table public.billing_customers enable row level security;
alter table public.billing_orders enable row level security;
alter table public.billing_payments enable row level security;
revoke all on public.billing_customers, public.billing_orders, public.billing_payments from anon, authenticated;
grant all on public.billing_customers, public.billing_orders, public.billing_payments to service_role;

create or replace function public.reserve_billing_order(p_user_id uuid, p_product text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order public.billing_orders%rowtype;
begin
  if p_product not in ('monthly', 'yearly', 'comparison') then raise exception 'invalid_product'; end if;
  perform 1 from public.user_entitlements where user_id = p_user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  select * into v_order from public.billing_orders
    where user_id = p_user_id and status = 'pending' and created_at > now() - interval '65 minutes'
    and ((product = 'comparison') = (p_product = 'comparison'))
    order by created_at desc limit 1;
  if not found then
    insert into public.billing_orders(user_id, product) values (p_user_id, p_product) returning * into v_order;
  end if;
  return to_jsonb(v_order);
end;
$$;

create or replace function public.apply_billing_payment(
  p_payment_id text, p_order_id uuid, p_customer_id text, p_subscription_id text,
  p_product text, p_amount integer, p_paid_until timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order public.billing_orders%rowtype;
  v_ent public.user_entitlements%rowtype;
  v_count integer;
begin
  select * into v_order from public.billing_orders where id = p_order_id;
  if not found then raise exception 'order_not_found'; end if;
  select * into v_ent from public.user_entitlements where user_id = v_order.user_id for update;
  if not found then raise exception 'entitlement_not_found'; end if;
  select * into v_order from public.billing_orders where id = p_order_id for update;
  if not exists (select 1 from public.billing_customers where user_id = v_order.user_id and stripe_customer_id = p_customer_id)
    or v_order.product <> p_product then raise exception 'payment_owner_mismatch'; end if;
  if p_amount <> (case p_product when 'monthly' then 14900 when 'yearly' then 99900 when 'comparison' then 5900 else -1 end)
    then raise exception 'payment_amount_mismatch'; end if;
  if p_product = 'comparison' then
    if p_payment_id not like 'cs_%' or p_subscription_id is not null then raise exception 'invalid_credit_payment'; end if;
    if v_order.status = 'paid' then return jsonb_build_object('duplicate', true); end if;
  else
    if p_payment_id not like 'in_%' or p_subscription_id is null or p_subscription_id not like 'sub_%'
      or p_paid_until is null then raise exception 'invalid_subscription_payment'; end if;
    if v_order.stripe_subscription_id is not null and v_order.stripe_subscription_id <> p_subscription_id
      then raise exception 'subscription_mismatch'; end if;
  end if;
  insert into public.billing_payments(id, order_id, user_id, product, amount, paid_until)
    values (p_payment_id, p_order_id, v_order.user_id, p_product, p_amount, p_paid_until)
    on conflict (id) do nothing;
  get diagnostics v_count = row_count;
  if v_count = 0 then return jsonb_build_object('duplicate', true); end if;
  if p_product = 'comparison' then
    update public.user_entitlements set purchased_comparison_credits = purchased_comparison_credits + 5, updated_at = now()
      where user_id = v_order.user_id;
  elsif p_paid_until > now() and (v_ent.premium_expires_at is null or p_paid_until > v_ent.premium_expires_at) then
    update public.user_entitlements set plan_id = 'premium', billing_cycle = p_product,
      premium_started_at = coalesce(premium_started_at, now()), premium_expires_at = p_paid_until,
      -- Never reset usage on payment/renewal. Only the calendar-month reset does that.
      updated_at = now() where user_id = v_order.user_id;
  end if;
  update public.billing_orders set status = 'paid', stripe_subscription_id = p_subscription_id where id = p_order_id;
  return jsonb_build_object('applied', true);
end;
$$;
revoke all on function public.reserve_billing_order(uuid, text) from public, anon, authenticated;
revoke all on function public.apply_billing_payment(text, uuid, text, text, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_billing_order(uuid, text) to service_role;
grant execute on function public.apply_billing_payment(text, uuid, text, text, text, integer, timestamptz) to service_role;
