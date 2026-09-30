-- Launch growth: invite links with a real reward, founding members, and an area launch meter.
--
-- How the reward works
--   * Every account gets a short invite code (soko18.vercel.app/?invite=CODE).
--   * A new member can claim one code within 14 days of signing up.
--   * When the invited friend's profile is approved (status -> live), the inviter gets
--     7 days of Gold and the friend gets 3 Super Likes. Staff approval + selfie check is
--     what stops fake-account farming; the inviter reward is capped (default 5 rewards).
--   * The first N accounts (default 1000) are founding members, shown with a badge.

insert into private.settings (key, value) values
  ('founding_limit', '1000'),
  ('invite_reward_days', '7'),
  ('invite_reward_cap', '5'),
  ('invite_friend_super_likes', '3'),
  ('launch_target_area', '50'),
  ('launch_target_city', '300')
on conflict (key) do nothing;

alter table public.accounts add column if not exists invite_code text;
alter table public.accounts add column if not exists founding_member boolean not null default false;
create unique index if not exists accounts_invite_code_idx on public.accounts (invite_code);

create table if not exists public.referrals (
  invitee_id uuid primary key references public.accounts (id) on delete cascade,
  inviter_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  reward text,
  constraint referrals_not_self check (invitee_id <> inviter_id)
);

create index if not exists referrals_inviter_idx on public.referrals (inviter_id, created_at desc);

alter table public.referrals enable row level security;

drop policy if exists referrals_own on public.referrals;
create policy referrals_own on public.referrals
  for select using (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()) or public.is_staff());

grant select on table public.referrals to authenticated;

create or replace function private.setting_int(p_key text, p_default integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(value, '')::integer from private.settings where key = p_key), p_default);
$$;

create or replace function private.new_invite_code()
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.accounts where invite_code = v_code);
  end loop;
  return v_code;
end;
$$;

-- New accounts: invite code + founding flag.
create or replace function private.account_launch_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.invite_code is null then
    new.invite_code := private.new_invite_code();
  end if;
  if (select count(*) from public.accounts) < private.setting_int('founding_limit', 1000) then
    new.founding_member := true;
  end if;
  return new;
end;
$$;

drop trigger if exists accounts_launch_defaults on public.accounts;
create trigger accounts_launch_defaults
before insert on public.accounts
for each row execute function private.account_launch_defaults();

-- Members can't hand themselves a code or a badge.
create or replace function private.guard_account_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff() then return new; end if;
  new.is_banned := old.is_banned;
  new.deleted_at := old.deleted_at;
  new.role := old.role;
  new.invite_code := old.invite_code;
  new.founding_member := old.founding_member;
  return new;
end;
$$;

-- Backfill: everyone already here is a founder and gets a code.
update public.accounts set invite_code = private.new_invite_code() where invite_code is null;
update public.accounts set founding_member = true where not founding_member;

-- Pay out a referral once the invited friend is approved.
create or replace function private.reward_referral(p_invitee uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ref public.referrals;
  v_rewarded integer;
  v_days integer := private.setting_int('invite_reward_days', 7);
  v_supers integer := private.setting_int('invite_friend_super_likes', 3);
  v_start timestamptz;
begin
  select * into v_ref from public.referrals where invitee_id = p_invitee and rewarded_at is null for update;
  if not found then return; end if;

  -- Friend's welcome gift.
  insert into public.member_perks (account_id) values (p_invitee) on conflict (account_id) do nothing;
  update public.member_perks set super_likes = super_likes + v_supers, updated_at = now() where account_id = p_invitee;
  insert into public.notifications (account_id, kind, title, body, href)
  values (p_invitee, 'system', 'Welcome gift', v_supers || ' Super Likes are waiting for you.', '/discover');

  select count(*) into v_rewarded from public.referrals where inviter_id = v_ref.inviter_id and reward = 'gold';
  if v_rewarded >= private.setting_int('invite_reward_cap', 5) then
    update public.referrals set rewarded_at = now(), reward = 'capped' where invitee_id = p_invitee;
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_ref.inviter_id, 'system', 'Your friend joined', 'Thanks for bringing people in. You''ve earned the maximum free Gold.', '/invite');
    return;
  end if;

  select greatest(now(), coalesce(max(ends_at), now())) into v_start
  from public.subscriptions where account_id = v_ref.inviter_id and plan = 'gold' and status = 'active';
  insert into public.subscriptions (account_id, plan, status, starts_at, ends_at)
  values (v_ref.inviter_id, 'gold', 'active', v_start, v_start + make_interval(days => v_days));
  update public.referrals set rewarded_at = now(), reward = 'gold' where invitee_id = p_invitee;
  insert into public.notifications (account_id, kind, title, body, href)
  values (v_ref.inviter_id, 'system', 'You earned ' || v_days || ' days of Gold', 'A friend you invited is now live on SOKO.', '/invite');
end;
$$;

create or replace function private.profile_live_rewards()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'live' and (tg_op = 'INSERT' or old.status is distinct from 'live') then
    perform private.reward_referral(new.account_id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_live_rewards on public.profiles;
create trigger profiles_live_rewards
after insert or update of status on public.profiles
for each row execute function private.profile_live_rewards();

-- Claim a friend's code (once, within 14 days of joining).
create or replace function public.claim_invite(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_inviter uuid;
  v_created timestamptz;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  if length(v_code) < 4 then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  select id into v_inviter from public.accounts where invite_code = v_code and not is_banned and deleted_at is null;
  if v_inviter is null then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if v_inviter = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if exists (select 1 from public.referrals where invitee_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;
  select created_at into v_created from public.accounts where id = v_uid;
  if v_created < now() - interval '14 days' then
    return jsonb_build_object('ok', false, 'reason', 'too_late');
  end if;
  insert into public.referrals (invitee_id, inviter_id) values (v_uid, v_inviter);
  -- Already live (rare): pay out now.
  if exists (select 1 from public.profiles where account_id = v_uid and status = 'live') then
    perform private.reward_referral(v_uid);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- What the invite screen shows.
create or replace function public.my_invites()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', a.invite_code,
    'founding', a.founding_member,
    'invited', (select count(*) from public.referrals r where r.inviter_id = a.id),
    'approved', (select count(*) from public.referrals r where r.inviter_id = a.id and r.rewarded_at is not null),
    'goldDaysEarned', (select count(*) from public.referrals r where r.inviter_id = a.id and r.reward = 'gold')
                      * private.setting_int('invite_reward_days', 7),
    'rewardDays', private.setting_int('invite_reward_days', 7),
    'rewardCap', private.setting_int('invite_reward_cap', 5),
    'friendSuperLikes', private.setting_int('invite_friend_super_likes', 3),
    'invitedBy', (select true from public.referrals r where r.invitee_id = a.id)
  )
  from public.accounts a
  where a.id = (select auth.uid());
$$;

-- Area launch meter: how many approved people are live in a city (or one area of it).
create or replace function public.area_launch(p_city_slug text, p_area_slug text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  with city as (
    select id from public.locations where slug = p_city_slug and kind = 'city' limit 1
  ), area as (
    select l.id from public.locations l join city c on l.parent_id = c.id
    where p_area_slug is not null and l.slug = p_area_slug limit 1
  )
  select jsonb_build_object(
    'live', (
      select count(*) from public.profiles p
      where p.status = 'live'
        and p.city_id = (select id from city)
        and (p_area_slug is null or p.area_id = (select id from area))
    ),
    'target', case when p_area_slug is null
      then private.setting_int('launch_target_city', 300)
      else private.setting_int('launch_target_area', 50) end
  );
$$;

revoke all on function public.claim_invite(text) from public, anon;
revoke all on function public.my_invites() from public, anon;
grant execute on function public.claim_invite(text) to authenticated;
grant execute on function public.my_invites() to authenticated;
grant execute on function public.area_launch(text, text) to anon, authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
