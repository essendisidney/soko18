-- K2a: Salamu (a paid first message to someone you haven't matched with) and richer "Looking for".
--
-- Salamu reuses the Platinum intro plumbing: the message lands in the recipient's Likes You (free to
-- read), counts as a like, and becomes the first chat message if they like back. The recipient can
-- ignore it, reply (like back, which opens the chat) or block. Salamu are bought as a consumable
-- (salamu_1 KES 59, salamu_5 KES 249), paid through the same ledger, and spent one per message.
-- The K1 age-band rule applies, and so does the paid-services filter.
--
-- "Looking for" tags are optional. Faith is sensitive: it's off unless the member ticks it, and
-- ticking it is what shows it (covered by the sensitive-data consent taken at sign-up).
-- There are no tribe or ethnicity fields or filters, and tests fail if one appears.

insert into private.settings (key, value) values ('salamu_daily_max', '10')
on conflict (key) do nothing;

-- Products ------------------------------------------------------------------

alter table public.products drop constraint if exists products_kind_check;
alter table public.products add constraint products_kind_check
  check (kind in ('plan', 'boost', 'super_like', 'incognito', 'salamu'));

insert into public.products (sku, title, line, amount_kes, kind, plan, days, quantity, bonus_super_likes, bonus_boosts, is_active, sort_order, requires_campus)
values
  ('salamu_1', 'Salamu', 'Message someone before you match. It lands in their Likes You.', 59, 'salamu', null, null, 1, 0, 0, true, 75, false),
  ('salamu_5', '5 Salamu', 'Five messages before matching. Use them any time.', 249, 'salamu', null, null, 5, 0, 0, true, 76, false)
on conflict (sku) do update set
  title = excluded.title,
  line = excluded.line,
  amount_kes = excluded.amount_kes,
  kind = excluded.kind,
  quantity = excluded.quantity,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.product_prices (sku, country_code, currency, amount) values
  ('salamu_1', 'KE', 'KES', 59),
  ('salamu_5', 'KE', 'KES', 249)
on conflict (sku, country_code) do update set amount = excluded.amount, currency = excluded.currency;

alter table public.member_perks add column if not exists salamu integer not null default 0;
alter table public.member_perks drop constraint if exists member_perks_salamu_check;
alter table public.member_perks add constraint member_perks_salamu_check check (salamu >= 0);

-- Intros carry what paid for them, and the recipient can ignore one.
alter table public.intros add column if not exists kind text not null default 'intro';
alter table public.intros drop constraint if exists intros_kind_check;
alter table public.intros add constraint intros_kind_check check (kind in ('intro', 'salamu'));
alter table public.intros add column if not exists ignored_at timestamptz;

-- Settlement: same as 00020, plus Salamu.
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

-- A Salamu is a paid like, so it isn't stopped by the free daily like cap. Same as 00020 otherwise.
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
  if coalesce(current_setting('soko.salamu', true), '') = 'on' then return new; end if;
  if private.active_plan(new.actor_id) is null then
    select count(*) into v_today_count from public.likes
    where actor_id = new.actor_id and kind in ('like', 'super', 'spotlight')
      and created_at >= private.member_today_start(new.actor_id);
    if v_today_count >= 30 then raise exception 'like_limit'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.send_salamu(p_profile uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_today integer;
  v_held boolean;
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  perform private.assert_active(v_uid);
  if p_body is null or length(trim(p_body)) not between 1 and 280 then raise exception 'invalid'; end if;
  select account_id into v_owner from public.profiles where id = p_profile and status = 'live';
  if v_owner is null or v_owner = v_uid or public.profile_hidden_from_me(v_owner) then
    raise exception 'not_found';
  end if;
  if private.age_band_blocks_message(v_uid, v_owner) then raise exception 'age_band'; end if;
  if exists (
    select 1 from public.matches m
    where (m.account_a = v_uid and m.account_b = v_owner) or (m.account_a = v_owner and m.account_b = v_uid)
  ) then
    raise exception 'already_matched';
  end if;
  select count(*) into v_today from public.intros
  where from_account = v_uid and kind = 'salamu' and created_at >= private.member_today_start(v_uid);
  if v_today >= private.setting_int('salamu_daily_max', 10) then raise exception 'salamu_limit'; end if;

  update public.member_perks set salamu = salamu - 1, updated_at = now()
  where account_id = v_uid and salamu > 0;
  if not found then raise exception 'no_salamu'; end if;

  v_held := private.looks_like_paid_service(p_body);
  insert into public.intros (from_account, to_profile, body, held, kind)
  values (v_uid, p_profile, trim(p_body), v_held, 'salamu')
  on conflict (from_account, to_profile) do nothing
  returning id into v_id;
  -- Raising rolls back the spend above, so nobody pays twice for the same person.
  if v_id is null then raise exception 'already_sent'; end if;
  if v_held then
    insert into public.moderation_cases (target_type, target_id, status) values ('message', v_id, 'open');
  end if;

  perform set_config('soko.salamu', 'on', true);
  insert into public.likes (actor_id, profile_id, kind) values (v_uid, p_profile, 'like')
  on conflict (actor_id, profile_id) do update set kind = case when likes.kind = 'pass' then 'like' else likes.kind end;
  perform set_config('soko.salamu', 'off', true);

  if not v_held then
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_owner, 'like', 'Someone sent you a Salamu', 'Open Likes You to read it.', '/likes');
  end if;
  return jsonb_build_object('id', v_id, 'held', v_held,
    'left', (select salamu from public.member_perks where account_id = v_uid));
end;
$$;

-- Messages waiting for me, Salamu marked, ignored ones left out.
create or replace function public.my_intros()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'body', i.body, 'at', i.created_at, 'kind', i.kind,
      'profileId', fp.id, 'slug', fp.slug, 'name', fp.display_name
    ) order by i.created_at desc), '[]'::jsonb)
  from public.intros i
  join public.profiles mine on mine.id = i.to_profile and mine.account_id = (select auth.uid())
  join public.profiles fp on fp.account_id = i.from_account and fp.status = 'live'
  where i.held = false
    and i.ignored_at is null
    and not exists (
      select 1 from public.matches m
      where (m.account_a = i.from_account and m.account_b = mine.account_id)
         or (m.account_b = i.from_account and m.account_a = mine.account_id)
    )
    and not exists (select 1 from public.blocks b where b.blocker_id = mine.account_id and b.blocked_id = i.from_account);
$$;

-- The recipient hides a message. The sender isn't told; it just never becomes a chat.
create or replace function public.ignore_intro(p_intro uuid)
returns void language sql security definer set search_path = public as $$
  update public.intros i set ignored_at = now()
  where i.id = p_intro
    and exists (select 1 from public.profiles p where p.id = i.to_profile and p.account_id = (select auth.uid()));
$$;

-- Same as 00020, plus the Salamu balance.
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
    'likesLeftToday', case when v_plan is null then greatest(0, 30 - v_used) else null end,
    'canMessageFirst', v_plan = 'platinum',
    'country', (select country_code from public.accounts where id = v_uid)
  );
end;
$$;

revoke all on function public.send_salamu(uuid, text) from public, anon;
grant execute on function public.send_salamu(uuid, text) to authenticated;
revoke all on function public.ignore_intro(uuid) from public, anon;
grant execute on function public.ignore_intro(uuid) to authenticated;
revoke all on function public.my_intros() from public, anon;
grant execute on function public.my_intros() to authenticated;
revoke all on function private.settle_transaction(uuid, text) from public, anon, authenticated;
revoke all on function private.enforce_like_rules() from public, anon, authenticated;

-- "Looking for" tags -----------------------------------------------------------

alter table public.profiles add column if not exists intent_tags text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_intent_tags_check;
alter table public.profiles add constraint profiles_intent_tags_check
  check (intent_tags <@ array['marriage', 'faith', 'kids', 'relocate', 'distance']::text[] and cardinality(intent_tags) <= 5);

-- Same as 00030, with the tags appended.
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
    p.intent_tags
   from profiles p
     join locations c on c.id = p.city_id
     left join locations a on a.id = p.area_id
     left join profile_media m on m.profile_id = p.id and m.is_cover = true and m.status = 'approved'::media_status
     left join accounts acc on acc.id = p.account_id
     left join campus_members cm on cm.account_id = p.account_id and cm.show_on_profile
     left join campuses cam on cam.id = cm.campus_id and cam.status <> 'closed'
  where p.status = 'live'::profile_status and p.flagged_reason is null and not profile_hidden_from_me(p.account_id);
