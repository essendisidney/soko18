-- K5: gifts, in-app only. A member can gift a match a Super Like pack, a Boost or a Gold week.
--
-- The giver pays Kutana the normal price (no discount); the ledger records the giver's purchase.
-- The recipient gets an entitlement only when they accept. If they decline, it goes to the giver
-- instead. Nothing is cash, airtime or transferable, and nothing is refunded to the recipient
-- (PIVOT hard rule 1). Only between matched members, at most 3 a week per giver.

alter table public.products drop constraint if exists products_kind_check, add constraint products_kind_check
  check (kind in ('plan', 'boost', 'super_like', 'incognito', 'salamu', 'home_away', 'trip', 'gift'));
alter table public.products add column if not exists gift_of text references public.products (sku);

insert into public.products (sku, title, line, amount_kes, kind, plan, days, quantity, bonus_super_likes, bonus_boosts, is_active, sort_order, requires_campus, gift_of)
values
  ('gift_super_5', 'Gift: 5 Super Likes', 'Five Super Likes for your match.', 199, 'gift', null, null, 1, 0, 0, true, 80, false, 'super_5'),
  ('gift_boost_1', 'Gift: a Boost', 'A 30-minute Boost for your match.', 99, 'gift', null, null, 1, 0, 0, true, 81, false, 'boost_1'),
  ('gift_gold_week', 'Gift: Gold for a week', 'Gold for 7 days for your match.', 149, 'gift', null, null, 1, 0, 0, true, 82, false, 'gold_week')
on conflict (sku) do update set
  title = excluded.title, line = excluded.line, amount_kes = excluded.amount_kes, kind = excluded.kind,
  quantity = excluded.quantity, is_active = excluded.is_active, sort_order = excluded.sort_order, gift_of = excluded.gift_of;

-- Same shelf price as the perk itself, in every market that sells it.
insert into public.product_prices (sku, country_code, currency, amount)
select g.sku, pp.country_code, pp.currency, pp.amount
from public.products g
join public.product_prices pp on pp.sku = g.gift_of
where g.kind = 'gift'
on conflict (sku, country_code) do update set amount = excluded.amount, currency = excluded.currency;

insert into private.settings (key, value) values ('gifts_weekly_max', '3') on conflict (key) do nothing;

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  giver_id uuid not null references public.accounts (id) on delete cascade,
  recipient_id uuid not null references public.accounts (id) on delete cascade,
  sku text not null references public.products (sku),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'sent', 'accepted', 'declined')),
  transaction_id uuid references public.transactions (id),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  responded_at timestamptz,
  check (giver_id <> recipient_id)
);
create index if not exists gifts_recipient_idx on public.gifts (recipient_id, status);
create index if not exists gifts_giver_idx on public.gifts (giver_id, created_at desc);
alter table public.gifts enable row level security;
drop policy if exists gifts_own on public.gifts;
create policy gifts_own on public.gifts
  for select using (giver_id = (select auth.uid()) or recipient_id = (select auth.uid()) or public.is_staff());
grant select on table public.gifts to authenticated;

alter table public.transactions add column if not exists gift_id uuid references public.gifts (id);

-- Checkout: same as 00039, plus a gift SKU must carry the giver's own unpaid gift, and only gift SKUs may.
drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (
    account_id = (select auth.uid())
    and status = 'pending'
    and (
      provider in ('mpesa', 'paystack', 'intasend')
      or (provider = 'sandbox' and public.payments_sandbox_on())
    )
    and provider_ref like transactions.provider || ':%'
    and checkout_request_id is null
    and mpesa_receipt is null
    and settled_at is null
    and provider_reference is null
    and result_desc is null
    and phone is null
    and amount_kes = round(transactions.amount)::integer
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
    and (
      not exists (select 1 from public.products p where p.sku = transactions.sku and p.requires_campus)
      or exists (select 1 from public.campus_members cm where cm.account_id = (select auth.uid()))
    )
    and (
      case when exists (select 1 from public.products p where p.sku = transactions.sku and p.kind = 'gift')
        then exists (
          select 1 from public.gifts g
          where g.id = transactions.gift_id and g.giver_id = (select auth.uid())
            and g.sku = transactions.sku and g.status = 'awaiting_payment'
        )
        else transactions.gift_id is null
      end
    )
  );

-- What a product does for an account. Shared by purchases and accepted gifts.
create or replace function private.apply_perk(p_account uuid, p_sku text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_product public.products%rowtype;
  v_plan text;
  v_start timestamptz;
  v_until timestamptz;
begin
  select * into v_product from public.products where sku = p_sku;
  insert into public.member_perks (account_id) values (p_account) on conflict (account_id) do nothing;
  if v_product.kind in ('plan', 'incognito', 'home_away') then
    v_plan := case v_product.kind when 'plan' then v_product.plan else v_product.kind end;
    select greatest(now(), coalesce(max(ends_at), now())) into v_start
    from public.subscriptions where account_id = p_account and plan = v_plan and status = 'active';
    v_until := v_start + make_interval(days => v_product.days);
    insert into public.subscriptions (account_id, plan, status, starts_at, ends_at)
    values (p_account, v_plan, 'active', v_start, v_until);
    update public.member_perks
    set super_likes = super_likes + v_product.bonus_super_likes, boosts = boosts + v_product.bonus_boosts, updated_at = now()
    where account_id = p_account;
  elsif v_product.kind = 'boost' then
    update public.member_perks set boosts = boosts + v_product.quantity, updated_at = now() where account_id = p_account;
  elsif v_product.kind = 'super_like' then
    update public.member_perks set super_likes = super_likes + v_product.quantity, updated_at = now() where account_id = p_account;
  elsif v_product.kind = 'salamu' then
    update public.member_perks set salamu = salamu + v_product.quantity, updated_at = now() where account_id = p_account;
  elsif v_product.kind = 'trip' then
    update public.member_perks set trips = trips + v_product.quantity, updated_at = now() where account_id = p_account;
  end if;
  return v_until;
end;
$$;

-- Settlement: same checks and ledger as before (00052). A gift posts the giver's purchase and
-- waits for the recipient; everything else applies straight away.
create or replace function private.settle_transaction(p_tx uuid, p_receipt text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
  v_product public.products%rowtype;
  v_perk public.products%rowtype;
  v_price numeric;
  v_until timestamptz;
  v_type text;
  v_gift public.gifts%rowtype;
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

  -- The perk being bought (for a gift, the perk inside it).
  if v_product.kind = 'gift' then
    select * into v_perk from public.products where sku = v_product.gift_of;
  else
    v_perk := v_product;
  end if;
  v_type := case v_perk.kind when 'plan' then v_perk.plan else v_perk.kind end;

  if v_product.kind = 'gift' then
    update public.gifts set status = 'sent', paid_at = now(), transaction_id = v_tx.id
    where id = v_tx.gift_id and status = 'awaiting_payment'
    returning * into v_gift;
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, v_type::public.ledger_type, v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'gift', v_perk.sku, 'giftId', v_gift.id, 'currency', v_tx.currency));
    if v_gift.id is not null then
      insert into public.notifications (account_id, kind, title, body, href)
      values (v_gift.recipient_id, 'system', 'You got a gift', 'A match sent you ' || lower(v_perk.title) || '. Accept it or say no thanks.', '/gifts');
    end if;
  else
    v_until := private.apply_perk(v_tx.account_id, v_product.sku);
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, v_type::public.ledger_type, v_tx.amount_kes, 'credit',
            jsonb_strip_nulls(jsonb_build_object('sku', v_product.sku, 'until', v_until,
              'quantity', case when v_until is null then v_product.quantity end, 'currency', v_tx.currency)));
  end if;

  insert into public.notifications (account_id, kind, title, body, href)
  values (v_tx.account_id, 'system', 'Payment received',
          case when v_product.kind = 'gift' then 'Your gift is on its way.' else v_product.title || ' is active.' end, '/me');

  return jsonb_build_object('transactionId', v_tx.id, 'sku', v_product.sku, 'until', v_until, 'ledgerPosted', true);
end;
$$;

-- The giver picks a gift for a match. Payment happens next, through normal checkout.
create or replace function public.start_gift(p_profile uuid, p_sku text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_to uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  perform private.assert_active(v_uid);
  if not exists (select 1 from public.products where sku = p_sku and kind = 'gift' and is_active) then raise exception 'invalid'; end if;
  select account_id into v_to from public.profiles where id = p_profile;
  if v_to is null or v_to = v_uid then raise exception 'not_found'; end if;
  if not exists (
    select 1 from public.matches m
    where (m.account_a = v_uid and m.account_b = v_to) or (m.account_a = v_to and m.account_b = v_uid)
  ) then
    raise exception 'not_matched';
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = v_uid and b.blocked_id = v_to) or (b.blocker_id = v_to and b.blocked_id = v_uid)
  ) then
    raise exception 'not_found';
  end if;
  if (select count(*) from public.gifts
      where giver_id = v_uid and status <> 'awaiting_payment' and paid_at > now() - interval '7 days')
     >= private.setting_int('gifts_weekly_max', 3) then
    raise exception 'gift_limit';
  end if;
  insert into public.gifts (giver_id, recipient_id, sku) values (v_uid, v_to, p_sku) returning id into v_id;
  return jsonb_build_object('giftId', v_id);
end;
$$;

-- The recipient accepts (the perk is theirs) or declines (the giver gets it instead).
create or replace function public.respond_gift(p_gift uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gift public.gifts%rowtype;
  v_perk text;
  v_title text;
begin
  select * into v_gift from public.gifts where id = p_gift and recipient_id = (select auth.uid()) and status = 'sent' for update;
  if v_gift.id is null then raise exception 'not_found'; end if;
  select g.gift_of, p.title into v_perk, v_title from public.products g join public.products p on p.sku = g.gift_of where g.sku = v_gift.sku;
  perform private.apply_perk(case when p_accept then v_gift.recipient_id else v_gift.giver_id end, v_perk);
  update public.gifts set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = v_gift.id;
  insert into public.notifications (account_id, kind, title, body, href)
  values (v_gift.giver_id, 'system',
          case when p_accept then 'Your gift was accepted' else 'Your gift came back to you' end,
          case when p_accept then 'They accepted ' || lower(v_title) || '.' else 'They said no thanks, so ' || lower(v_title) || ' is yours now.' end,
          '/me');
  return jsonb_build_object('status', case when p_accept then 'accepted' else 'declined' end);
end;
$$;

-- Gifts waiting for me, and the ones I sent, without exposing anything about payments.
create or replace function public.my_gifts()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'received', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'sku', g.sku, 'title', perk.title, 'from', split_part(btrim(p.display_name), ' ', 1), 'at', g.paid_at) order by g.paid_at desc)
      from public.gifts g
      join public.products gp on gp.sku = g.sku
      join public.products perk on perk.sku = gp.gift_of
      left join public.profiles p on p.account_id = g.giver_id
      where g.recipient_id = (select auth.uid()) and g.status = 'sent'
    ), '[]'::jsonb),
    'sentThisWeek', (select count(*) from public.gifts where giver_id = (select auth.uid()) and status <> 'awaiting_payment' and paid_at > now() - interval '7 days'),
    'weeklyMax', private.setting_int('gifts_weekly_max', 3)
  );
$$;

revoke all on function private.apply_perk(uuid, text) from public, anon, authenticated;
revoke all on function private.settle_transaction(uuid, text) from public, anon, authenticated;
revoke all on function public.start_gift(uuid, text) from public, anon;
grant execute on function public.start_gift(uuid, text) to authenticated;
revoke all on function public.respond_gift(uuid, boolean) from public, anon;
grant execute on function public.respond_gift(uuid, boolean) to authenticated;
revoke all on function public.my_gifts() from public, anon;
grant execute on function public.my_gifts() to authenticated;
