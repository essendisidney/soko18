-- Fair nudges: a free first taste, a daily streak reward, and a real "active now" count.
--
-- Every gift is recorded in member_gifts (one row per gift, unique per account + key), so a gift
-- can't be paid out twice and we can always show exactly what was given and why. Nothing here is
-- paid, so nothing touches the ledger. The "active now" count is real and only shown at 10+.

insert into private.settings (key, value) values
  ('welcome_super_likes', '1'),
  ('welcome_boosts', '1'),
  ('streak_days', '5'),
  ('streak_super_likes', '1'),
  ('active_now_minutes', '15'),
  ('active_now_min', '10')
on conflict (key) do nothing;

create table if not exists public.member_gifts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null check (kind in ('welcome', 'streak')),
  gift_key text not null,
  super_likes integer not null default 0 check (super_likes >= 0),
  boosts integer not null default 0 check (boosts >= 0),
  created_at timestamptz not null default now(),
  unique (account_id, kind, gift_key)
);

alter table public.member_gifts enable row level security;
drop policy if exists member_gifts_own on public.member_gifts;
create policy member_gifts_own on public.member_gifts
  for select using (account_id = (select auth.uid()) or public.is_staff());
grant select on table public.member_gifts to authenticated;

create table if not exists public.member_streaks (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  current_days integer not null default 0,
  best_days integer not null default 0,
  last_day date
);

alter table public.member_streaks enable row level security;
drop policy if exists member_streaks_own on public.member_streaks;
create policy member_streaks_own on public.member_streaks
  for select using (account_id = (select auth.uid()) or public.is_staff());
grant select on table public.member_streaks to authenticated;

-- Give a gift once. Returns true only the first time for this key.
create or replace function private.give_gift(
  p_account uuid, p_kind text, p_key text, p_supers integer, p_boosts integer, p_title text, p_body text
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.member_gifts (account_id, kind, gift_key, super_likes, boosts)
  values (p_account, p_kind, p_key, p_supers, p_boosts)
  on conflict (account_id, kind, gift_key) do nothing
  returning id into v_id;
  if v_id is null then return false; end if;
  insert into public.member_perks (account_id) values (p_account) on conflict (account_id) do nothing;
  update public.member_perks
  set super_likes = super_likes + p_supers, boosts = boosts + p_boosts, updated_at = now()
  where account_id = p_account;
  insert into public.notifications (account_id, kind, title, body, href)
  values (p_account, 'system', p_title, p_body, '/upgrade');
  return true;
end;
$$;

-- First time a profile goes live: one free Super Like and one free Boost, so they see them work.
create or replace function private.profile_live_rewards()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'live' and (tg_op = 'INSERT' or old.status is distinct from 'live') then
    perform private.reward_referral(new.account_id);
    if not exists (select 1 from public.accounts where id = new.account_id and is_test) then
      perform private.give_gift(
        new.account_id, 'welcome', 'first-live',
        private.setting_int('welcome_super_likes', 1), private.setting_int('welcome_boosts', 1),
        'Welcome gift', 'A free Super Like and a free 30-minute Boost are waiting for you.'
      );
    end if;
  end if;
  return new;
end;
$$;

-- Opening the app once a day (Nairobi time) builds a streak. Every 5th day in a row, with a
-- live profile, earns a free Super Like. Also marks the member as seen, for "active now".
create or replace function public.check_in_today()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_today date := (now() at time zone 'Africa/Nairobi')::date;
  v_row public.member_streaks;
  v_days integer;
  v_every integer := greatest(1, private.setting_int('streak_days', 5));
  v_gift boolean := false;
begin
  if v_uid is null then return null; end if;
  update public.accounts set last_seen_at = now() where id = v_uid;

  select * into v_row from public.member_streaks where account_id = v_uid for update;
  if not found then
    insert into public.member_streaks (account_id, current_days, best_days, last_day)
    values (v_uid, 1, 1, v_today)
    returning * into v_row;
  elsif v_row.last_day is distinct from v_today then
    v_days := case when v_row.last_day = v_today - 1 then v_row.current_days + 1 else 1 end;
    update public.member_streaks
    set current_days = v_days, best_days = greatest(best_days, v_days), last_day = v_today
    where account_id = v_uid
    returning * into v_row;
    if v_days % v_every = 0 and exists (select 1 from public.profiles where account_id = v_uid and status = 'live') then
      v_gift := private.give_gift(
        v_uid, 'streak', v_today::text, private.setting_int('streak_super_likes', 1), 0,
        v_days || ' days in a row', 'Thanks for coming back. Here''s a free Super Like.'
      );
    end if;
  end if;

  return jsonb_build_object(
    'days', v_row.current_days,
    'every', v_every,
    'gift', v_gift
  );
end;
$$;

-- The app pings this every few minutes while it's open. Cheap: writes at most once per 5 minutes.
create or replace function public.touch_seen()
returns void language sql security definer set search_path = public as $$
  update public.accounts set last_seen_at = now()
  where id = (select auth.uid())
    and (last_seen_at is null or last_seen_at < now() - interval '5 minutes');
$$;

-- Real people with a live profile in this city (or area) who opened Kutana in the last 15 minutes.
-- Returns null below 10, so a small number never shows and nobody can be singled out.
create or replace function public.active_now(p_city_slug text, p_area_slug text default null)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  v_count integer;
begin
  select count(distinct p.account_id) into v_count
  from public.profiles p
  join public.accounts a on a.id = p.account_id
  join public.locations c on c.id = p.city_id and c.kind = 'city' and c.slug = p_city_slug
  left join public.locations ar on ar.id = p.area_id
  where p.status = 'live'
    and not a.is_test
    and a.deleted_at is null
    and not a.is_banned
    and a.last_seen_at > now() - make_interval(mins => private.setting_int('active_now_minutes', 15))
    and (p_area_slug is null or ar.slug = p_area_slug);
  if v_count < private.setting_int('active_now_min', 10) then return null; end if;
  return v_count;
end;
$$;

revoke all on function private.give_gift(uuid, text, text, integer, integer, text, text) from public, anon, authenticated;
revoke all on function public.check_in_today() from public, anon;
grant execute on function public.check_in_today() to authenticated;
revoke all on function public.touch_seen() from public, anon;
grant execute on function public.touch_seen() to authenticated;
revoke all on function public.active_now(text, text) from public;
grant execute on function public.active_now(text, text) to anon, authenticated;
