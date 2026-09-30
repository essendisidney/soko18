-- Multi-country: markets, local prices and currencies, card payments (Paystack) next to M-Pesa,
-- and daily limits that follow each market's own clock.
-- Kenya is live. Other markets are listed as waitlist until you switch them on.

create table if not exists public.markets (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  name text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  timezone text not null,
  status text not null default 'waitlist' check (status in ('live', 'waitlist', 'closed')),
  payment_providers text[] not null default '{}',
  default_locale text not null default 'en',
  launch_order integer not null default 100,
  safety_notice text
);

alter table public.markets enable row level security;
drop policy if exists markets_read on public.markets;
create policy markets_read on public.markets for select using (status <> 'closed' or public.is_staff());
grant select on table public.markets to anon, authenticated;

insert into public.markets (country_code, name, currency, timezone, status, payment_providers, default_locale, launch_order) values
  ('KE', 'Kenya',         'KES', 'Africa/Nairobi',       'live',     array['mpesa', 'paystack'], 'en', 1),
  ('TZ', 'Tanzania',      'TZS', 'Africa/Dar_es_Salaam', 'waitlist', array['paystack'],          'sw', 2),
  ('UG', 'Uganda',        'UGX', 'Africa/Kampala',       'waitlist', array['paystack'],          'en', 3),
  ('RW', 'Rwanda',        'RWF', 'Africa/Kigali',        'waitlist', array['paystack'],          'en', 4),
  ('NG', 'Nigeria',       'NGN', 'Africa/Lagos',         'waitlist', array['paystack'],          'en', 5),
  ('GH', 'Ghana',         'GHS', 'Africa/Accra',         'waitlist', array['paystack'],          'en', 6),
  ('ZA', 'South Africa',  'ZAR', 'Africa/Johannesburg',  'waitlist', array['paystack'],          'en', 7),
  ('CI', 'Côte d’Ivoire', 'XOF', 'Africa/Abidjan',       'waitlist', array['paystack'],          'fr', 8),
  ('GB', 'United Kingdom','GBP', 'Europe/London',        'waitlist', array['paystack'],          'en', 20),
  ('US', 'United States', 'USD', 'America/New_York',     'waitlist', array['paystack'],          'en', 21)
on conflict (country_code) do nothing;

-- Local price list. amount is in the currency's major unit (KES 499, NGN 3500, USD 9.99 → 9.99).
create table if not exists public.product_prices (
  sku text not null references public.products (sku) on delete cascade,
  country_code text not null references public.markets (country_code) on delete cascade,
  currency text not null,
  amount numeric(12, 2) not null check (amount > 0),
  primary key (sku, country_code)
);

alter table public.product_prices enable row level security;
drop policy if exists product_prices_read on public.product_prices;
create policy product_prices_read on public.product_prices for select using (true);
grant select on table public.product_prices to anon, authenticated;

-- Kenya = the existing KES list. Other markets are starting points to adjust before launch.
insert into public.product_prices (sku, country_code, currency, amount)
select sku, 'KE', 'KES', amount_kes from public.products
on conflict (sku, country_code) do update set amount = excluded.amount, currency = excluded.currency;

insert into public.product_prices (sku, country_code, currency, amount) values
  ('gold_week','NG','NGN',1000),('gold_month','NG','NGN',3500),('platinum_month','NG','NGN',6500),('boost_1','NG','NGN',700),('boost_5','NG','NGN',2800),('super_1','NG','NGN',350),('super_5','NG','NGN',1400),('incognito_month','NG','NGN',2000),
  ('gold_week','GH','GHS',15),('gold_month','GH','GHS',45),('platinum_month','GH','GHS',90),('boost_1','GH','GHS',10),('boost_5','GH','GHS',40),('super_1','GH','GHS',5),('super_5','GH','GHS',20),('incognito_month','GH','GHS',30),
  ('gold_week','ZA','ZAR',39),('gold_month','ZA','ZAR',119),('platinum_month','ZA','ZAR',229),('boost_1','ZA','ZAR',25),('boost_5','ZA','ZAR',99),('super_1','ZA','ZAR',12),('super_5','ZA','ZAR',49),('incognito_month','ZA','ZAR',69),
  ('gold_week','UG','UGX',4000),('gold_month','UG','UGX',14000),('platinum_month','UG','UGX',28000),('boost_1','UG','UGX',3000),('boost_5','UG','UGX',11000),('super_1','UG','UGX',1500),('super_5','UG','UGX',5500),('incognito_month','UG','UGX',8000),
  ('gold_week','TZ','TZS',3000),('gold_month','TZ','TZS',10000),('platinum_month','TZ','TZS',20000),('boost_1','TZ','TZS',2000),('boost_5','TZ','TZS',8000),('super_1','TZ','TZS',1000),('super_5','TZ','TZS',4000),('incognito_month','TZ','TZS',6000),
  ('gold_week','RW','RWF',1500),('gold_month','RW','RWF',5000),('platinum_month','RW','RWF',10000),('boost_1','RW','RWF',1000),('boost_5','RW','RWF',4000),('super_1','RW','RWF',500),('super_5','RW','RWF',2000),('incognito_month','RW','RWF',3000),
  ('gold_week','CI','XOF',800),('gold_month','CI','XOF',2500),('platinum_month','CI','XOF',5000),('boost_1','CI','XOF',500),('boost_5','CI','XOF',2000),('super_1','CI','XOF',300),('super_5','CI','XOF',1000),('incognito_month','CI','XOF',1500),
  ('gold_week','GB','GBP',4.99),('gold_month','GB','GBP',12.99),('platinum_month','GB','GBP',24.99),('boost_1','GB','GBP',3.99),('boost_5','GB','GBP',14.99),('super_1','GB','GBP',1.99),('super_5','GB','GBP',7.99),('incognito_month','GB','GBP',7.99),
  ('gold_week','US','USD',5.99),('gold_month','US','USD',14.99),('platinum_month','US','USD',29.99),('boost_1','US','USD',4.99),('boost_5','US','USD',17.99),('super_1','US','USD',2.49),('super_5','US','USD',9.99),('incognito_month','US','USD',9.99)
on conflict (sku, country_code) do nothing;

-- Members and places belong to a market.
alter table public.accounts
  add column if not exists country_code text references public.markets (country_code) default 'KE';

alter table public.locations
  add column if not exists country_code text references public.markets (country_code);
update public.locations set country_code = 'KE' where country_code is null;

-- Transactions record currency and market. amount_kes keeps its name for compatibility;
-- it holds the amount in the transaction's currency (major units, rounded for KES).
alter table public.transactions
  add column if not exists currency text not null default 'KES',
  add column if not exists country_code text not null default 'KE',
  add column if not exists amount numeric(12, 2),
  add column if not exists provider_reference text unique;

update public.transactions set amount = amount_kes where amount is null;

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (
    account_id = (select auth.uid())
    and status = 'pending'
    and provider in ('sandbox', 'mpesa', 'paystack')
    and checkout_request_id is null
    and mpesa_receipt is null
    and settled_at is null
    and exists (select 1 from public.products p where p.sku = transactions.sku and p.is_active)
    and exists (
      select 1 from public.product_prices pp
      join public.markets m on m.country_code = pp.country_code and m.status = 'live'
      where pp.sku = transactions.sku
        and pp.country_code = transactions.country_code
        and pp.currency = transactions.currency
        and pp.amount = transactions.amount
    )
    and (provider <> 'mpesa' or transactions.currency = 'KES')
  );

-- Settlement: price is checked against the market price list, not the KES base.
create or replace function private.settle_transaction(p_tx uuid, p_receipt text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
  v_product public.products%rowtype;
  v_price numeric;
  v_start timestamptz;
  v_until timestamptz;
  v_plan text;
begin
  select * into v_tx from public.transactions where id = p_tx for update;
  if not found then raise exception 'not_found'; end if;
  if v_tx.status = 'completed' then
    return jsonb_build_object('transactionId', v_tx.id, 'alreadySettled', true);
  end if;
  if v_tx.status <> 'pending' then raise exception 'forbidden'; end if;

  select * into v_product from public.products where sku = v_tx.sku;
  select amount into v_price from public.product_prices
  where sku = v_tx.sku and country_code = v_tx.country_code and currency = v_tx.currency;
  if v_product.sku is null or v_price is null or v_price <> coalesce(v_tx.amount, v_tx.amount_kes) then
    raise exception 'invalid';
  end if;

  update public.transactions
  set status = 'completed', mpesa_receipt = case when provider = 'mpesa' then coalesce(p_receipt, mpesa_receipt) else mpesa_receipt end,
      provider_reference = case when provider <> 'mpesa' then coalesce(p_receipt, provider_reference) else provider_reference end,
      settled_at = now()
  where id = v_tx.id;

  insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
  values (v_tx.account_id, v_tx.id, 'payment', v_tx.amount_kes, 'debit',
          jsonb_build_object('sku', v_product.sku, 'receipt', p_receipt, 'currency', v_tx.currency, 'amount', v_tx.amount));

  insert into public.member_perks (account_id) values (v_tx.account_id) on conflict (account_id) do nothing;

  if v_product.kind in ('plan', 'incognito') then
    v_plan := coalesce(v_product.plan, 'incognito');
    select greatest(now(), coalesce(max(ends_at), now())) into v_start
    from public.subscriptions where account_id = v_tx.account_id and plan = v_plan and status = 'active';
    v_until := v_start + make_interval(days => v_product.days);
    insert into public.subscriptions (account_id, plan, status, starts_at, ends_at)
    values (v_tx.account_id, v_plan, 'active', v_start, v_until);
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, v_plan::public.ledger_type, v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'until', v_until, 'currency', v_tx.currency));
    update public.member_perks
    set super_likes = super_likes + v_product.bonus_super_likes, boosts = boosts + v_product.bonus_boosts, updated_at = now()
    where account_id = v_tx.account_id;
  elsif v_product.kind = 'boost' then
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, 'boost', v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'quantity', v_product.quantity, 'currency', v_tx.currency));
    update public.member_perks set boosts = boosts + v_product.quantity, updated_at = now() where account_id = v_tx.account_id;
  elsif v_product.kind = 'super_like' then
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, 'super_like', v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'quantity', v_product.quantity, 'currency', v_tx.currency));
    update public.member_perks set super_likes = super_likes + v_product.quantity, updated_at = now() where account_id = v_tx.account_id;
  end if;

  insert into public.notifications (account_id, kind, title, body, href)
  values (v_tx.account_id, 'system', 'Payment received', v_product.title || ' is active.', '/me');

  return jsonb_build_object('transactionId', v_tx.id, 'sku', v_product.sku, 'until', v_until, 'ledgerPosted', true);
end;
$$;

-- M-Pesa: amounts in KES.
create or replace function public.settle_mpesa_checkout(p_checkout text, p_receipt text, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
begin
  select * into v_tx from public.transactions where checkout_request_id = p_checkout;
  if not found then raise exception 'not_found'; end if;
  if v_tx.currency <> 'KES' or coalesce(v_tx.amount, v_tx.amount_kes) <> p_amount then
    update public.transactions set status = 'failed', result_desc = 'amount_mismatch' where id = v_tx.id and status = 'pending';
    raise exception 'invalid';
  end if;
  return private.settle_transaction(v_tx.id, p_receipt);
end;
$$;

-- Card / Paystack: the webhook passes the verified amount (major units) and currency.
create or replace function public.settle_card_payment(p_tx uuid, p_reference text, p_amount numeric, p_currency text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
begin
  select * into v_tx from public.transactions where id = p_tx;
  if not found or v_tx.provider <> 'paystack' then raise exception 'not_found'; end if;
  if v_tx.currency <> upper(p_currency) or coalesce(v_tx.amount, v_tx.amount_kes) <> p_amount then
    update public.transactions set status = 'failed', result_desc = 'amount_mismatch' where id = v_tx.id and status = 'pending';
    raise exception 'invalid';
  end if;
  return private.settle_transaction(v_tx.id, p_reference);
end;
$$;

create or replace function public.fail_card_payment(p_tx uuid, p_desc text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.transactions set status = 'failed', result_desc = left(p_desc, 200)
  where id = p_tx and provider = 'paystack' and status = 'pending';
$$;

revoke all on function public.settle_card_payment(uuid, text, numeric, text) from public, anon, authenticated;
revoke all on function public.fail_card_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.settle_card_payment(uuid, text, numeric, text) to service_role;
grant execute on function public.fail_card_payment(uuid, text) to service_role;

-- "Today" follows the member's market clock (Lagos, Kampala, London …).
create or replace function private.member_today_start(p_account uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select (timezone(tz, now())::date)::timestamp at time zone tz
  from (
    select coalesce(
      (select m.timezone from public.accounts a join public.markets m on m.country_code = a.country_code where a.id = p_account),
      'Africa/Nairobi'
    ) tz
  ) t;
$$;

create or replace function private.enforce_like_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_count integer;
begin
  if new.kind = 'pass' then return new; end if;
  if tg_op = 'UPDATE' and old.kind = new.kind then return new; end if;
  if new.kind = 'super' then
    update public.member_perks set super_likes = super_likes - 1, updated_at = now()
    where account_id = new.actor_id and super_likes > 0;
    if not found then raise exception 'no_super_likes'; end if;
    return new;
  end if;
  if private.active_plan(new.actor_id) is null then
    select count(*) into v_today_count from public.likes
    where actor_id = new.actor_id and kind in ('like', 'super', 'spotlight')
      and created_at >= private.member_today_start(new.actor_id);
    if v_today_count >= 30 then raise exception 'like_limit'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.my_entitlements()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_plan text;
  v_plan_until timestamptz;
  v_perks public.member_perks%rowtype;
  v_used integer;
begin
  if v_uid is null then
    return jsonb_build_object('plan', null, 'likesLeftToday', 0);
  end if;
  v_plan := private.active_plan(v_uid);
  select max(ends_at) into v_plan_until from public.subscriptions
  where account_id = v_uid and plan = v_plan and status = 'active';
  select * into v_perks from public.member_perks where account_id = v_uid;
  select count(*) into v_used from public.likes
  where actor_id = v_uid and kind in ('like', 'super', 'spotlight')
    and created_at >= private.member_today_start(v_uid);
  return jsonb_build_object(
    'plan', v_plan,
    'planUntil', v_plan_until,
    'incognito', private.has_incognito(v_uid),
    'superLikes', coalesce(v_perks.super_likes, 0),
    'boosts', coalesce(v_perks.boosts, 0),
    'likesLeftToday', case when v_plan is null then greatest(0, 30 - v_used) else null end,
    'canMessageFirst', v_plan = 'platinum',
    'country', (select country_code from public.accounts where id = v_uid)
  );
end;
$$;

-- Members can set their market (from the app's country picker / IP guess).
create or replace function public.set_my_country(p_country text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then raise exception 'unauthorized'; end if;
  if not exists (select 1 from public.markets where country_code = upper(p_country) and status <> 'closed') then
    raise exception 'invalid';
  end if;
  update public.accounts set country_code = upper(p_country) where id = (select auth.uid());
  return jsonb_build_object('country', upper(p_country));
end;
$$;

revoke all on function public.set_my_country(text) from public, anon;
grant execute on function public.set_my_country(text) to authenticated;

-- Waitlist for markets that aren't live yet (real counts only).
create table if not exists public.market_waitlist (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.markets (country_code) on delete cascade,
  email text not null check (position('@' in email) > 1 and length(email) <= 200),
  created_at timestamptz not null default now(),
  unique (country_code, email)
);

alter table public.market_waitlist enable row level security;
drop policy if exists market_waitlist_insert on public.market_waitlist;
create policy market_waitlist_insert on public.market_waitlist
  for insert to anon, authenticated
  with check (exists (select 1 from public.markets m where m.country_code = market_waitlist.country_code and m.status = 'waitlist'));
drop policy if exists market_waitlist_staff on public.market_waitlist;
create policy market_waitlist_staff on public.market_waitlist for select using (public.is_staff());
grant insert on table public.market_waitlist to anon, authenticated;
grant select on table public.market_waitlist to authenticated;

-- Funnel revenue: M-Pesa/KES total plus a per-currency breakdown (currencies are never summed together).
create or replace function public.staff_funnel(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'days', p_days,
    'signups', (select count(*) from public.accounts where created_at >= v_since),
    'confirmedAge', (select count(*) from public.accounts where created_at >= v_since and age_confirmed_at is not null),
    'profilesCreated', (select count(*) from public.profiles p join public.accounts a on a.id = p.account_id where a.created_at >= v_since),
    'profilesLive', (select count(*) from public.profiles p join public.accounts a on a.id = p.account_id where a.created_at >= v_since and p.status = 'live'),
    'verified', (select count(*) from public.profiles p join public.accounts a on a.id = p.account_id where a.created_at >= v_since and p.is_verified),
    'liked', (select count(distinct actor_id) from public.likes where created_at >= v_since and kind <> 'pass'),
    'matched', (select count(distinct x) from (select account_a x from public.matches where created_at >= v_since union all select account_b from public.matches where created_at >= v_since) t),
    'messaged', (select count(distinct sender_id) from public.messages where created_at >= v_since),
    'checkoutStarted', (select count(distinct account_id) from public.transactions where created_at >= v_since),
    'paid', (select count(distinct account_id) from public.transactions where created_at >= v_since and status = 'completed'),
    'revenueKes', (select coalesce(sum(coalesce(amount, amount_kes)), 0) from public.transactions
                   where created_at >= v_since and status = 'completed' and provider <> 'sandbox' and currency = 'KES'),
    'revenueByCurrency', coalesce((
      select jsonb_object_agg(currency, total) from (
        select currency, sum(coalesce(amount, amount_kes)) total from public.transactions
        where created_at >= v_since and status = 'completed' and provider <> 'sandbox'
        group by currency
      ) r
    ), '{}'::jsonb),
    'bySku', coalesce((
      select jsonb_object_agg(sku, jsonb_build_object('count', n, 'kes', kes))
      from (
        select sku, count(*) n, sum(coalesce(amount, amount_kes)) kes from public.transactions
        where created_at >= v_since and status = 'completed' and provider <> 'sandbox' and sku is not null and currency = 'KES'
        group by sku
      ) s
    ), '{}'::jsonb)
  );
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
