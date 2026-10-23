-- K4b: Home & Away and Coming Home, for Kenyans abroad.
--
-- Cities on Kutana are Kenyan, so a member abroad keeps a Kenyan city on their profile (where
-- they're from) and their account country says where they live. They show in that city's deck
-- only with Home & Away (home_away_month) or around a Coming Home trip (from 14 days before
-- arrival until they leave), labelled "Lives in the UK · from Nairobi" or "Visiting from the UK,
-- 15 Dec". Kenyan members need nothing: diaspora members browse their home city like anyone.
--
-- Priced only in the diaspora markets' own currencies (GB in GBP, US in USD) through
-- product_prices, never converted or summed. Those markets are still waitlist, so nothing can be
-- bought until the owner opens them; amount_kes is only a reference for reports.

alter table public.products drop constraint if exists products_kind_check, add constraint products_kind_check
  check (kind in ('plan', 'boost', 'super_like', 'incognito', 'salamu', 'home_away', 'trip'));

insert into public.products (sku, title, line, amount_kes, kind, plan, days, quantity, bonus_super_likes, bonus_boosts, is_active, sort_order, requires_campus)
values
  ('home_away_month', 'Home & Away · 30 days', 'Show up at home while you live abroad.', 1699, 'home_away', null, 30, 1, 0, 0, true, 90, false),
  ('coming_home_trip', 'Coming Home trip', 'Show up in your home city from 14 days before you land.', 2499, 'trip', null, null, 1, 0, 0, true, 91, false)
on conflict (sku) do update set
  title = excluded.title, line = excluded.line, amount_kes = excluded.amount_kes, kind = excluded.kind,
  days = excluded.days, quantity = excluded.quantity, is_active = excluded.is_active, sort_order = excluded.sort_order;

insert into public.product_prices (sku, country_code, currency, amount) values
  ('home_away_month', 'GB', 'GBP', 9.99),
  ('home_away_month', 'US', 'USD', 12.99),
  ('coming_home_trip', 'GB', 'GBP', 14.99),
  ('coming_home_trip', 'US', 'USD', 19.99)
on conflict (sku, country_code) do update set amount = excluded.amount, currency = excluded.currency;

alter table public.member_perks add column if not exists trips integer not null default 0 constraint member_perks_trips_check check (trips >= 0);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  city_id uuid not null references public.locations (id),
  arrives_on date not null,
  leaves_on date not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  check (leaves_on >= arrives_on and leaves_on <= arrives_on + 60)
);
create index if not exists trips_account_idx on public.trips (account_id, arrives_on);
alter table public.trips enable row level security;
drop policy if exists trips_own on public.trips;
create policy trips_own on public.trips for select using (account_id = (select auth.uid()) or public.is_staff());
grant select on table public.trips to authenticated;

create or replace function private.has_home_away(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.account_id = p_account and s.plan = 'home_away' and s.status = 'active'
      and s.starts_at <= now() and s.ends_at > now()
  );
$$;

-- Where a member abroad is from: a Kenyan city.
create or replace function public.set_home_city(p_city_slug text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_city uuid;
begin
  if (select auth.uid()) is null then raise exception 'unauthorized'; end if;
  select id into v_city from public.locations where slug = p_city_slug and kind = 'city';
  if v_city is null then raise exception 'not_found'; end if;
  perform set_config('soko.system', 'on', true);
  update public.accounts set home_city_id = v_city where id = (select auth.uid());
  perform set_config('soko.system', 'off', true);
end;
$$;

-- Plan a trip home. Free with Home & Away, otherwise it spends one Coming Home trip.
create or replace function public.plan_trip(p_city_slug text, p_arrives date, p_leaves date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_city uuid;
  v_id uuid;
  v_paid boolean;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  perform private.assert_active(v_uid);
  if coalesce((select country_code from public.accounts where id = v_uid), 'KE') = 'KE' then raise exception 'not_abroad'; end if;
  select id into v_city from public.locations where slug = p_city_slug and kind = 'city';
  if v_city is null then raise exception 'not_found'; end if;
  if p_arrives is null or p_leaves is null or p_arrives < current_date or p_arrives > current_date + 365
     or p_leaves < p_arrives or p_leaves > p_arrives + 60 then
    raise exception 'invalid_dates';
  end if;
  if (select count(*) from public.trips where account_id = v_uid and status = 'active' and leaves_on >= current_date) >= 3 then
    raise exception 'too_many';
  end if;
  v_paid := private.has_home_away(v_uid);
  if not v_paid then
    update public.member_perks set trips = trips - 1, updated_at = now() where account_id = v_uid and trips > 0;
    if not found then raise exception 'no_trip'; end if;
  end if;
  insert into public.trips (account_id, city_id, arrives_on, leaves_on) values (v_uid, v_city, p_arrives, p_leaves)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'included', v_paid);
end;
$$;

create or replace function public.cancel_trip(p_trip uuid)
returns void language sql security definer set search_path = public as $$
  update public.trips set status = 'cancelled' where id = p_trip and account_id = (select auth.uid()) and status = 'active';
$$;

-- Settlement: same as 00046, plus Home & Away and trips.
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
  elsif v_product.kind = 'home_away' then
    select greatest(now(), coalesce(max(ends_at), now())) into v_start
    from public.subscriptions where account_id = v_tx.account_id and plan = 'home_away' and status = 'active';
    v_until := v_start + make_interval(days => v_product.days);
    insert into public.subscriptions (account_id, plan, status, starts_at, ends_at)
    values (v_tx.account_id, 'home_away', 'active', v_start, v_until);
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, 'home_away', v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'until', v_until, 'currency', v_tx.currency));
  elsif v_product.kind = 'trip' then
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, 'trip', v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'quantity', v_product.quantity, 'currency', v_tx.currency));
    update public.member_perks set trips = trips + v_product.quantity, updated_at = now() where account_id = v_tx.account_id;
  elsif v_product.kind = 'salamu' then
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, 'salamu', v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'quantity', v_product.quantity, 'currency', v_tx.currency));
    update public.member_perks set salamu = salamu + v_product.quantity, updated_at = now() where account_id = v_tx.account_id;
  end if;

  insert into public.notifications (account_id, kind, title, body, href)
  values (v_tx.account_id, 'system', 'Payment received', v_product.title || ' is active.', '/me');

  return jsonb_build_object('transactionId', v_tx.id, 'sku', v_product.sku, 'until', v_until, 'ledgerPosted', true);
end;
$$;

-- Same as 00046, plus Home & Away and trip credits.
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
    'salamu', coalesce(v_perks.salamu, 0),
    'trips', coalesce(v_perks.trips, 0),
    'homeAway', private.has_home_away(v_uid),
    'likesLeftToday', case when v_plan is null then greatest(0, 30 - v_used) else null end,
    'canMessageFirst', v_plan = 'platinum',
    'country', (select country_code from public.accounts where id = v_uid)
  );
end;
$$;

-- Same as 00046, plus who lives abroad, where they're from and any trip home.
create or replace view public.live_profile_cards as
 select p.id,
    p.slug,
    p.display_name,
    p.birth_year,
    p.gender,
    p.looking_for,
    p.is_verified,
    p.status,
    p.boost_until,
    p.bio,
    p.prompts,
    c.slug as city_slug,
    c.name as city_name,
    a.slug as area_slug,
    a.name as area_name,
    m.storage_path as cover_path,
    coalesce(acc.is_test, false) as is_test,
    cam.slug as campus_slug,
    cam.short_name as campus_name,
    p.intent_tags,
    case when coalesce(acc.country_code, 'KE') <> 'KE' then acc.country_code end as away_country,
    hc.name as home_city_name,
    trip.arrives_on as visit_arrives
   from profiles p
     join locations c on c.id = p.city_id
     left join locations a on a.id = p.area_id
     left join profile_media m on m.profile_id = p.id and m.is_cover = true and m.status = 'approved'::media_status
     left join accounts acc on acc.id = p.account_id
     left join campus_members cm on cm.account_id = p.account_id and cm.show_on_profile
     left join campuses cam on cam.id = cm.campus_id and cam.status <> 'closed'
     left join locations hc on hc.id = acc.home_city_id
     left join lateral (
       select t.arrives_on from public.trips t
       where t.account_id = p.account_id and t.city_id = p.city_id and t.status = 'active'
         and current_date between t.arrives_on - 14 and t.leaves_on
       order by t.arrives_on limit 1
     ) trip on true
  where p.status = 'live'::profile_status and p.flagged_reason is null and not profile_hidden_from_me(p.account_id)
    -- Members living abroad show in Kenyan decks with Home & Away, or around a Coming Home trip.
    and (coalesce(acc.country_code, 'KE') = 'KE' or private.has_home_away(p.account_id) or trip.arrives_on is not null);

-- Same as 00048: members abroad join drops only with Home & Away or around a trip home.
create or replace function private.drop_candidates(p_viewer uuid, p_limit integer)
returns table (profile_id uuid, score integer)
language sql stable security definer set search_path = public as $$
  with me as (
    select p.id as profile_id, p.city_id, p.area_id, p.looking_for, p.gender, p.intent_tags, a.show_me, w.min_age, w.max_age
    from public.accounts a
    join public.profiles p on p.account_id = a.id and p.status = 'live'
    cross join lateral private.age_window(a.id) w
    where a.id = p_viewer
  )
  select p.id,
    (case when p.looking_for = me.looking_for then 3 else 0 end)
    + (case when p.area_id is not null and p.area_id = me.area_id then 2 else 0 end)
    + (case when exists (
        select 1 from public.vouches v1 join public.vouches v2 on v2.voucher_id = v1.voucher_id
        where v1.vouchee_id = p_viewer and v2.vouchee_id = p.account_id
      ) then 2 else 0 end)
    + (case when a.last_seen_at > now() - interval '1 day' then 2 else 0 end)
    + coalesce(cardinality(array(select unnest(p.intent_tags) intersect select unnest(me.intent_tags))), 0)
    + (case when exists (select 1 from public.profile_voice pv where pv.profile_id = p.id and pv.status = 'approved') then 1 else 0 end)
  from me
  join public.profiles p on p.city_id = me.city_id and p.status = 'live' and p.flagged_reason is null
  join public.accounts a on a.id = p.account_id
  where p.account_id <> p_viewer
    and not a.is_test and not a.is_banned and a.deleted_at is null
    and (coalesce(a.country_code, 'KE') = 'KE' or private.has_home_away(a.id) or exists (
      select 1 from public.trips t
      where t.account_id = a.id and t.city_id = p.city_id and t.status = 'active'
        and current_date between t.arrives_on - 14 and t.leaves_on
    ))
    and a.last_seen_at > now() - make_interval(days => private.setting_int('drop_active_days', 14))
    and p.gender = any(me.show_me)
    and (me.gender is null or me.gender = any(a.show_me))
    and coalesce(private.member_age(p.account_id), 0) between me.min_age and me.max_age
    and not exists (select 1 from public.likes l where l.actor_id = p_viewer and l.profile_id = p.id)
    and not exists (
      select 1 from public.matches m
      where (m.account_a = p_viewer and m.account_b = p.account_id) or (m.account_b = p_viewer and m.account_a = p.account_id)
    )
    and not exists (
      select 1 from public.drop_picks d
      where d.account_id = p_viewer and d.profile_id = p.id and d.created_at > now() - interval '14 days'
    )
    and not public.profile_hidden_from_me(p.account_id)
  order by 2 desc, random()
  limit greatest(p_limit, 0);
$$;

revoke all on function private.has_home_away(uuid) from public, anon, authenticated;
revoke all on function private.drop_candidates(uuid, integer) from public, anon, authenticated;
revoke all on function public.set_home_city(text) from public, anon;
grant execute on function public.set_home_city(text) to authenticated;
revoke all on function public.plan_trip(text, date, date) from public, anon;
grant execute on function public.plan_trip(text, date, date) to authenticated;
revoke all on function public.cancel_trip(uuid) from public, anon;
grant execute on function public.cancel_trip(uuid) to authenticated;
revoke all on function private.settle_transaction(uuid, text) from public, anon, authenticated;
