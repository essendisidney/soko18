-- Dating pivot, part 2.
-- One kind of member. Everyone has a profile, everyone can pay.
-- Revenue: Gold / Platinum plans, Boosts, Super Likes, Incognito — all via M-Pesa STK.
-- The platform never takes a cut of anything arranged between members.
-- Profiles or messages that offer or request paid services are held for review.

-- ---------------------------------------------------------------------------
-- Members: gender, who they want to see, what they're looking for
-- ---------------------------------------------------------------------------

alter table public.accounts
  add column if not exists gender text check (gender in ('man', 'woman', 'nonbinary')),
  add column if not exists show_me text[] not null default array['man', 'woman', 'nonbinary'],
  add column if not exists looking_for text check (looking_for in ('relationship', 'casual', 'friends', 'unsure'));

alter table public.profiles
  add column if not exists gender text check (gender in ('man', 'woman', 'nonbinary')),
  add column if not exists looking_for text check (looking_for in ('relationship', 'casual', 'friends', 'unsure')),
  add column if not exists flagged_reason text;

create index if not exists profiles_live_gender_idx on public.profiles (status, gender, city_id);

-- Members cannot unban or undelete themselves through accounts_update_own.
create or replace function private.guard_account_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    return new;
  end if;
  new.is_banned := old.is_banned;
  new.deleted_at := old.deleted_at;
  new.role := old.role;
  return new;
end;
$$;

drop trigger if exists accounts_guard_columns on public.accounts;
create trigger accounts_guard_columns
before update on public.accounts
for each row execute function private.guard_account_columns();

-- Post-meeting ratings were a marketplace feature. Dating apps don't grade people.
drop table if exists public.ratings cascade;

-- ---------------------------------------------------------------------------
-- Paid-services filter (backstop; the app runs the same check before saving)
-- ---------------------------------------------------------------------------

create or replace function private.looks_like_paid_service(p_text text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_text, '') ~* any (array[
    '\m(escort|escorts|call ?girl|incall|outcall|in-call|out-call)\M',
    '\m(happy ending|nuru|body ?to ?body|b2b)\M',
    '\m(short ?time|long ?time|short ?call|long ?call)\M',
    '\m(rates?|charges?|price ?list|pricing)\M.{0,40}\m(hour|hr|hrs|night|shot|round|session|visit)s?\M',
    '(ksh|kes|sh\.?|bob|\$|usd)\s*\d[\d,\.]*\s*k?\s*(per|/|a|an|for)\s*(hour|hr|night|shot|round|session)',
    '\d[\d,\.]*\s*k?\s*(bob|ksh|kes)?\s*(per|/)\s*(hour|hr|night|shot|round|session)',
    '\m(send|pay)\s*(fare|deposit|mpesa|m-pesa)\s*first\M',
    '\m(fare|deposit)\s*first\M',
    '\msponsor\s*(wanted|needed|available)\M'
  ]);
$$;

create or replace function private.profile_paid_service_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flagged boolean := private.looks_like_paid_service(coalesce(new.display_name, '') || ' ' || coalesce(new.bio, ''));
begin
  if public.is_staff() then
    return new;
  end if;

  if v_flagged then
    new.flagged_reason := 'paid_services';
    if new.status in ('live', 'pending_review') then
      new.status := 'pending_review';
    end if;
  elsif tg_op = 'UPDATE' then
    -- Only staff clear a flag.
    new.flagged_reason := old.flagged_reason;
  else
    new.flagged_reason := null;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_paid_service_check on public.profiles;
create trigger profiles_paid_service_check
before insert or update on public.profiles
for each row execute function private.profile_paid_service_check();

create or replace function private.profile_open_flag_case()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.flagged_reason is not null
     and (tg_op = 'INSERT' or old.flagged_reason is distinct from new.flagged_reason
          or old.bio is distinct from new.bio)
     and not exists (
       select 1 from public.moderation_cases
       where target_type = 'profile' and target_id = new.id and status <> 'resolved'
     )
  then
    insert into public.moderation_cases (target_type, target_id, status)
    values ('profile', new.id, 'open');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_open_flag_case on public.profiles;
create trigger profiles_open_flag_case
after insert or update on public.profiles
for each row execute function private.profile_open_flag_case();

-- Messages: a flagged message is stored but held from the recipient until review.
alter table public.messages
  add column if not exists held boolean not null default false;

create or replace function private.message_paid_service_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.held := private.looks_like_paid_service(new.body);
    return new;
  end if;

  -- Recipients may only mark read. Nothing else changes outside staff.
  if not public.is_staff() then
    new.body := old.body;
    new.media_path := old.media_path;
    new.held := old.held;
    new.sender_id := old.sender_id;
    new.conversation_id := old.conversation_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_paid_service_check on public.messages;
create trigger messages_paid_service_check
before insert or update on public.messages
for each row execute function private.message_paid_service_check();

create or replace function private.message_open_flag_case()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.held then
    insert into public.moderation_cases (target_type, target_id, status, opened_by)
    values ('message', new.id, 'open', null);
  end if;
  return new;
end;
$$;

drop trigger if exists messages_open_flag_case on public.messages;
create trigger messages_open_flag_case
after insert on public.messages
for each row execute function private.message_open_flag_case();

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    (
      (held = false or sender_id = (select auth.uid()))
      and exists (
        select 1 from public.conversations c
        join public.matches m on m.id = c.match_id
        where c.id = conversation_id
          and (m.account_a = (select auth.uid()) or m.account_b = (select auth.uid()))
      )
    )
    or public.is_staff()
  );

-- Paid-services reports open a case straight away.
create or replace function private.report_open_case()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reason = 'paid_services'
     and not exists (
       select 1 from public.moderation_cases
       where target_type = new.target_type and target_id = new.target_id and status <> 'resolved'
     )
  then
    insert into public.moderation_cases (target_type, target_id, status, opened_by)
    values (new.target_type, new.target_id, 'open', new.reporter_id);
  end if;
  return new;
end;
$$;

drop trigger if exists reports_open_case on public.reports;
create trigger reports_open_case
after insert on public.reports
for each row execute function private.report_open_case();

-- ---------------------------------------------------------------------------
-- Products (price list lives in the database so amounts can't be forged)
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  sku text primary key,
  title text not null,
  line text not null default '',
  amount_kes integer not null check (amount_kes > 0),
  kind text not null check (kind in ('plan', 'boost', 'super_like', 'incognito')),
  plan text check (plan in ('gold', 'platinum')),
  days integer,
  quantity integer not null default 1 check (quantity > 0),
  bonus_super_likes integer not null default 0,
  bonus_boosts integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

alter table public.products enable row level security;

drop policy if exists products_read_active on public.products;
create policy products_read_active on public.products
  for select using (is_active = true or public.is_staff());

grant select on table public.products to anon, authenticated;

insert into public.products (sku, title, line, amount_kes, kind, plan, days, quantity, bonus_super_likes, bonus_boosts, sort_order) values
  ('gold_week',       'Gold · 7 days',      'Unlimited likes, see who likes you, 3 Super Likes.',         149, 'plan',       'gold',     7,  1, 3,  0, 10),
  ('gold_month',      'Gold · 30 days',     'Unlimited likes, see who likes you, 5 Super Likes.',              499, 'plan',       'gold',     30, 1, 5,  0, 20),
  ('platinum_month',  'Platinum · 30 days', 'Gold, plus Incognito, a free Boost and 10 Super Likes.', 999, 'plan',       'platinum', 30, 1, 10, 1, 30),
  ('boost_1',         'Boost',              'Top of the deck in your area for 30 minutes.',                    99,  'boost',      null,       null, 1, 0, 0, 40),
  ('boost_5',         '5 Boosts',           'Five 30-minute Boosts. Use them any time.',                       399, 'boost',      null,       null, 5, 0, 0, 50),
  ('super_1',         'Super Like',         'They see you liked them before they swipe.',                      49,  'super_like', null,       null, 1, 0, 0, 60),
  ('super_5',         '5 Super Likes',      'Five Super Likes.',                                               199, 'super_like', null,       null, 5, 0, 0, 70),
  ('incognito_month', 'Incognito · 30 days','Only people you like can see you.',                               299, 'incognito',  null,       30, 1, 0, 0, 80)
on conflict (sku) do update set
  title = excluded.title,
  line = excluded.line,
  amount_kes = excluded.amount_kes,
  kind = excluded.kind,
  plan = excluded.plan,
  days = excluded.days,
  quantity = excluded.quantity,
  bonus_super_likes = excluded.bonus_super_likes,
  bonus_boosts = excluded.bonus_boosts,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Transactions carry the SKU and M-Pesa references
-- ---------------------------------------------------------------------------

alter table public.transactions
  add column if not exists sku text references public.products (sku),
  add column if not exists phone text,
  add column if not exists checkout_request_id text unique,
  add column if not exists mpesa_receipt text unique,
  add column if not exists result_desc text,
  add column if not exists settled_at timestamptz;

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert
  to authenticated
  with check (
    account_id = (select auth.uid())
    and status = 'pending'
    and provider in ('sandbox', 'mpesa')
    and checkout_request_id is null
    and mpesa_receipt is null
    and settled_at is null
    and exists (
      select 1 from public.products p
      where p.sku = transactions.sku
        and p.is_active
        and p.amount_kes = transactions.amount_kes
    )
  );

-- Runtime switches staff control. Sandbox settlement is off once M-Pesa is live.
create table if not exists private.settings (
  key text primary key,
  value text not null
);

insert into private.settings (key, value) values ('payments_sandbox', 'on')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Perks: consumable balances. Members read their own; only settlement writes.
-- ---------------------------------------------------------------------------

create table if not exists public.member_perks (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  super_likes integer not null default 0 check (super_likes >= 0),
  boosts integer not null default 0 check (boosts >= 0),
  updated_at timestamptz not null default now()
);

alter table public.member_perks enable row level security;

drop policy if exists member_perks_own on public.member_perks;
create policy member_perks_own on public.member_perks
  for select using (account_id = (select auth.uid()) or public.is_staff());

grant select on table public.member_perks to authenticated;

create or replace function private.active_plan(p_account uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.plan
  from public.subscriptions s
  where s.account_id = p_account
    and s.status = 'active'
    and s.plan in ('gold', 'platinum')
    and s.starts_at <= now()
    and (s.ends_at is null or s.ends_at > now())
  order by case s.plan when 'platinum' then 0 else 1 end
  limit 1;
$$;

create or replace function private.has_incognito(p_account uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.account_id = p_account
      and s.status = 'active'
      and s.plan in ('incognito', 'platinum')
      and s.starts_at <= now()
      and (s.ends_at is null or s.ends_at > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- Settlement: one path for sandbox and M-Pesa
-- ---------------------------------------------------------------------------

create or replace function private.settle_transaction(p_tx uuid, p_receipt text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
  v_product public.products%rowtype;
  v_start timestamptz;
  v_until timestamptz;
  v_plan text;
begin
  select * into v_tx from public.transactions where id = p_tx for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_tx.status = 'completed' then
    return jsonb_build_object('transactionId', v_tx.id, 'alreadySettled', true);
  end if;
  if v_tx.status <> 'pending' then
    raise exception 'forbidden';
  end if;

  select * into v_product from public.products where sku = v_tx.sku;
  if not found or v_product.amount_kes <> v_tx.amount_kes then
    raise exception 'invalid';
  end if;

  update public.transactions
  set status = 'completed',
      mpesa_receipt = coalesce(p_receipt, mpesa_receipt),
      settled_at = now()
  where id = v_tx.id;

  insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
  values (v_tx.account_id, v_tx.id, 'payment', v_tx.amount_kes, 'debit',
          jsonb_build_object('sku', v_product.sku, 'receipt', p_receipt));

  insert into public.member_perks (account_id) values (v_tx.account_id)
  on conflict (account_id) do nothing;

  if v_product.kind in ('plan', 'incognito') then
    v_plan := coalesce(v_product.plan, 'incognito');
    -- Renewals stack on the end of the current period.
    select greatest(now(), coalesce(max(ends_at), now())) into v_start
    from public.subscriptions
    where account_id = v_tx.account_id and plan = v_plan and status = 'active';
    v_until := v_start + make_interval(days => v_product.days);

    insert into public.subscriptions (account_id, plan, status, starts_at, ends_at)
    values (v_tx.account_id, v_plan, 'active', v_start, v_until);

    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, v_plan::public.ledger_type, v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'until', v_until));

    update public.member_perks
    set super_likes = super_likes + v_product.bonus_super_likes,
        boosts = boosts + v_product.bonus_boosts,
        updated_at = now()
    where account_id = v_tx.account_id;

  elsif v_product.kind = 'boost' then
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, 'boost', v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'quantity', v_product.quantity));
    update public.member_perks
    set boosts = boosts + v_product.quantity, updated_at = now()
    where account_id = v_tx.account_id;

  elsif v_product.kind = 'super_like' then
    insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
    values (v_tx.account_id, v_tx.id, 'super_like', v_tx.amount_kes, 'credit',
            jsonb_build_object('sku', v_product.sku, 'quantity', v_product.quantity));
    update public.member_perks
    set super_likes = super_likes + v_product.quantity, updated_at = now()
    where account_id = v_tx.account_id;
  end if;

  insert into public.notifications (account_id, kind, title, body, href)
  values (v_tx.account_id, 'system', 'Payment received', v_product.title || ' is active.', '/me');

  return jsonb_build_object(
    'transactionId', v_tx.id,
    'sku', v_product.sku,
    'until', v_until,
    'ledgerPosted', true
  );
end;
$$;

-- Sandbox: the payer settles their own pending sandbox row, only while sandbox is on.
drop function if exists public.settle_sandbox_transaction(uuid);
create or replace function public.settle_sandbox_transaction(p_tx uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
begin
  if coalesce((select value from private.settings where key = 'payments_sandbox'), 'off') <> 'on' then
    raise exception 'forbidden';
  end if;
  select * into v_tx from public.transactions where id = p_tx;
  if not found or v_tx.account_id is distinct from (select auth.uid()) or v_tx.provider <> 'sandbox' then
    raise exception 'forbidden';
  end if;
  return private.settle_transaction(p_tx, null);
end;
$$;

revoke all on function public.settle_sandbox_transaction(uuid) from public, anon;
grant execute on function public.settle_sandbox_transaction(uuid) to authenticated;

-- M-Pesa: server-only (service_role) after Daraja calls back.
create or replace function public.attach_mpesa_checkout(p_tx uuid, p_checkout text, p_phone text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.transactions
  set checkout_request_id = p_checkout, phone = p_phone
  where id = p_tx and status = 'pending' and provider = 'mpesa';
$$;

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
  if not found then
    raise exception 'not_found';
  end if;
  if v_tx.amount_kes <> p_amount then
    update public.transactions set status = 'failed', result_desc = 'amount_mismatch'
    where id = v_tx.id and status = 'pending';
    raise exception 'invalid';
  end if;
  return private.settle_transaction(v_tx.id, p_receipt);
end;
$$;

create or replace function public.fail_mpesa_checkout(p_checkout text, p_desc text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.transactions
  set status = 'failed', result_desc = left(p_desc, 200)
  where checkout_request_id = p_checkout and status = 'pending';
$$;

revoke all on function public.attach_mpesa_checkout(uuid, text, text) from public, anon, authenticated;
revoke all on function public.settle_mpesa_checkout(text, text, integer) from public, anon, authenticated;
revoke all on function public.fail_mpesa_checkout(text, text) from public, anon, authenticated;
grant execute on function public.attach_mpesa_checkout(uuid, text, text) to service_role;
grant execute on function public.settle_mpesa_checkout(text, text, integer) to service_role;
grant execute on function public.fail_mpesa_checkout(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Boost: spend one Boost for 30 minutes at the top of the local deck
-- ---------------------------------------------------------------------------

create or replace function private.paid_flags_require_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('soko.paid_ok', true), '') = 'on' or public.is_staff() then
    return new;
  end if;
  if (new.boost_until is distinct from old.boost_until and new.boost_until > now())
     or (new.spotlight_until is distinct from old.spotlight_until and new.spotlight_until > now())
     or (new.featured_until is distinct from old.featured_until and new.featured_until > now())
  then
    raise exception 'paid flags are set by settlement only';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_paid_flags_ledger on public.profiles;
create trigger profiles_paid_flags_ledger
before update of featured_until, boost_until, spotlight_until on public.profiles
for each row execute function private.paid_flags_require_ledger();

create or replace function private.forbid_paid_flags_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.boost_until := null;
  new.spotlight_until := null;
  new.featured_until := null;
  return new;
end;
$$;

drop trigger if exists profiles_no_paid_flags_on_insert on public.profiles;
create trigger profiles_no_paid_flags_on_insert
before insert on public.profiles
for each row execute function private.forbid_paid_flags_on_insert();

create or replace function public.use_boost()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles%rowtype;
  v_until timestamptz;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  select * into v_profile from public.profiles where account_id = v_uid;
  if not found or v_profile.status <> 'live' then
    raise exception 'profile_not_live';
  end if;

  update public.member_perks
  set boosts = boosts - 1, updated_at = now()
  where account_id = v_uid and boosts > 0;
  if not found then
    raise exception 'no_boosts';
  end if;

  v_until := greatest(now(), coalesce(v_profile.boost_until, now())) + interval '30 minutes';

  perform set_config('soko.paid_ok', 'on', true);
  update public.profiles set boost_until = v_until where id = v_profile.id;
  perform set_config('soko.paid_ok', '', true);

  insert into public.boosts (profile_id, transaction_id, starts_at, ends_at)
  select v_profile.id, le.transaction_id, now(), v_until
  from public.ledger_entries le
  where le.account_id = v_uid and le.type in ('boost', 'platinum') and le.direction = 'credit'
  order by le.created_at desc
  limit 1;

  return jsonb_build_object('boostUntil', v_until);
end;
$$;

revoke all on function public.use_boost() from public, anon;
grant execute on function public.use_boost() to authenticated;

-- ---------------------------------------------------------------------------
-- Likes: free daily cap, Super Likes spend a perk, matches on super too
-- ---------------------------------------------------------------------------

create or replace function private.enforce_like_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_count integer;
begin
  if new.kind = 'pass' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.kind = new.kind then
    return new;
  end if;

  if new.kind = 'super' then
    update public.member_perks
    set super_likes = super_likes - 1, updated_at = now()
    where account_id = new.actor_id and super_likes > 0;
    if not found then
      raise exception 'no_super_likes';
    end if;
    return new;
  end if;

  if private.active_plan(new.actor_id) is null then
    select count(*) into v_today_count
    from public.likes
    where actor_id = new.actor_id
      and kind in ('like', 'super', 'spotlight')
      and created_at >= (private.nairobi_today()::timestamp at time zone 'Africa/Nairobi');
    if v_today_count >= 30 then
      raise exception 'like_limit';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists likes_enforce_rules on public.likes;
create trigger likes_enforce_rules
before insert or update of kind on public.likes
for each row execute function private.enforce_like_rules();

create or replace function private.handle_like_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  left_id uuid;
  right_id uuid;
  match_id uuid;
begin
  if new.kind = 'pass' then
    return new;
  end if;

  select account_id into owner_id from public.profiles where id = new.profile_id;
  if owner_id is null or owner_id = new.actor_id then
    return new;
  end if;

  if new.kind = 'super' then
    insert into public.notifications (account_id, kind, title, body, href)
    values (owner_id, 'like', 'Someone Super Liked you', 'Open Discover to see them first.', '/discover');
  end if;

  if exists (
    select 1 from public.likes
    where actor_id = owner_id
      and profile_id in (select id from public.profiles where account_id = new.actor_id)
      and kind in ('like', 'spotlight', 'super')
  ) then
    left_id := least(new.actor_id, owner_id);
    right_id := greatest(new.actor_id, owner_id);

    insert into public.matches (account_a, account_b, profile_id)
    values (left_id, right_id, new.profile_id)
    on conflict (account_a, account_b) do nothing
    returning id into match_id;

    if match_id is not null then
      insert into public.conversations (match_id) values (match_id);
      insert into public.notifications (account_id, kind, title, body, href)
      values
        (new.actor_id, 'match', 'It''s a match', 'You both liked each other.', '/matches'),
        (owner_id, 'match', 'It''s a match', 'You both liked each other.', '/matches');
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- What members can see about themselves
-- ---------------------------------------------------------------------------

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
  select max(ends_at) into v_plan_until
  from public.subscriptions
  where account_id = v_uid and plan = v_plan and status = 'active';

  select * into v_perks from public.member_perks where account_id = v_uid;

  select count(*) into v_used
  from public.likes
  where actor_id = v_uid
    and kind in ('like', 'super', 'spotlight')
    and created_at >= (private.nairobi_today()::timestamp at time zone 'Africa/Nairobi');

  return jsonb_build_object(
    'plan', v_plan,
    'planUntil', v_plan_until,
    'incognito', private.has_incognito(v_uid),
    'superLikes', coalesce(v_perks.super_likes, 0),
    'boosts', coalesce(v_perks.boosts, 0),
    'likesLeftToday', case when v_plan is null then greatest(0, 30 - v_used) else null end,
    'canMessageFirst', v_plan = 'platinum'
  );
end;
$$;

revoke all on function public.my_entitlements() from public, anon;
grant execute on function public.my_entitlements() to authenticated;

-- Everyone sees how many people like them. Gold and Platinum see who.
create or replace function public.liked_me()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
  v_people jsonb;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;

  select count(*) into v_count
  from public.likes l
  join public.profiles mine on mine.id = l.profile_id and mine.account_id = v_uid
  where l.kind in ('like', 'super', 'spotlight')
    and not exists (select 1 from public.likes back where back.actor_id = v_uid and back.profile_id in (
      select p.id from public.profiles p where p.account_id = l.actor_id))
    and not exists (select 1 from public.blocks b where b.blocker_id = v_uid and b.blocked_id = l.actor_id);

  if private.active_plan(v_uid) is null then
    return jsonb_build_object('count', v_count, 'people', null, 'locked', true);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'profileId', p.id, 'slug', p.slug, 'name', p.display_name,
      'super', l.kind = 'super', 'at', l.created_at) order by l.kind = 'super' desc, l.created_at desc), '[]'::jsonb)
  into v_people
  from public.likes l
  join public.profiles mine on mine.id = l.profile_id and mine.account_id = v_uid
  join public.profiles p on p.account_id = l.actor_id and p.status = 'live'
  where l.kind in ('like', 'super', 'spotlight')
    and not exists (select 1 from public.likes back where back.actor_id = v_uid and back.profile_id = p.id)
    and not exists (select 1 from public.blocks b where b.blocker_id = v_uid and b.blocked_id = l.actor_id);

  return jsonb_build_object('count', v_count, 'people', v_people, 'locked', false);
end;
$$;

revoke all on function public.liked_me() from public, anon;
grant execute on function public.liked_me() to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Discovery cards: gender + looking for; Incognito members only appear to
-- people they have already liked.
-- ---------------------------------------------------------------------------

create or replace function public.profile_hidden_from_me(p_account uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_account is distinct from (select auth.uid())
    and private.has_incognito(p_account)
    and not exists (
      select 1 from public.likes l
      join public.profiles mine on mine.id = l.profile_id
      where l.actor_id = p_account
        and mine.account_id = (select auth.uid())
        and l.kind in ('like', 'super', 'spotlight')
    );
$$;

revoke all on function public.profile_hidden_from_me(uuid) from public;
grant execute on function public.profile_hidden_from_me(uuid) to anon, authenticated;

drop view if exists public.live_profile_cards;
create view public.live_profile_cards
with (security_invoker = true) as
select
  p.id,
  p.slug,
  p.display_name,
  p.birth_year,
  p.gender,
  p.looking_for,
  p.is_verified,
  p.status,
  p.boost_until,
  c.slug as city_slug,
  c.name as city_name,
  a.slug as area_slug,
  a.name as area_name,
  m.storage_path as cover_path
from public.profiles p
join public.locations c on c.id = p.city_id
left join public.locations a on a.id = p.area_id
left join public.profile_media m on m.profile_id = p.id and m.is_cover = true and m.status = 'approved'
where p.status = 'live'
  and p.flagged_reason is null
  and not public.profile_hidden_from_me(p.account_id);

grant select on public.live_profile_cards to anon, authenticated;

-- Super Likes count as likes in daily stats.
create or replace function private.record_like_stat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind in ('like', 'spotlight', 'super')
     and (tg_op = 'INSERT' or old.kind = 'pass')
  then
    perform private.bump_daily_stat(new.profile_id, 0, 1, 0);
  end if;
  return new;
end;
$$;

-- Nairobi launch areas the app already lists.
insert into public.locations (kind, name, slug, parent_id, sort_order)
select 'area'::public.location_kind, v.name, v.slug, c.id, v.sort_order
from public.locations c
join (values
  ('Kileleshwa', 'kileleshwa', 4),
  ('Lavington', 'lavington', 5),
  ('South B', 'south-b', 6),
  ('Karen', 'karen', 7),
  ('Parklands', 'parklands', 8),
  ('Thika Road', 'thika-road', 9)
) as v(name, slug, sort_order) on true
where c.slug = 'nairobi' and c.kind = 'city'
on conflict (parent_id, slug) do nothing;

revoke execute on all functions in schema private from public, anon, authenticated;
