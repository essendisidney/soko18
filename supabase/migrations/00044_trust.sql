-- K1 Trust (docs/KUTANA_NEXT.md).
--
-- 1. Age bands. Members aged 18–25 see ±4 years by default. A member aged 30+ only appears to an
--    18–25 member who has widened their own range to include them. Enforced in the database
--    (profile_hidden_from_me drives profiles RLS, the Discover cards view and likes), not just the UI.
--    Paid messages before a match (send_intro, and Salamu in K2) can't go from 30+ to 18–25.
--    Staff see accounts liking or messaging many people 10+ years younger.
-- 2. Rafiki vouches. A verified member (selfie- or campus-verified) can vouch for up to 5 people.
--    Profiles show "Vouched by …" with first names only (up to 3). A banned voucher's vouches go.
--    Staff can see vouches between brand-new accounts (ring detection).
-- (Jina check: no payment rail returns the payer's name; nothing built. See KUTANA_NEXT.md.)

-- 1. Age bands ---------------------------------------------------------------------------------
alter table public.accounts add column if not exists show_age_min smallint;
alter table public.accounts add column if not exists show_age_max smallint;

create or replace function private.member_age(p_account uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    extract(year from age(current_date, a.date_of_birth))::int,
    (select extract(year from now())::int - p.birth_year from public.profiles p where p.account_id = a.id and p.birth_year is not null limit 1)
  )
  from public.accounts a where a.id = p_account;
$$;

-- The range a member sees: what they chose, or the default for their age.
create or replace function private.age_window(p_account uuid, out min_age integer, out max_age integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_age integer := private.member_age(p_account);
  v_min smallint;
  v_max smallint;
begin
  select show_age_min, show_age_max into v_min, v_max from public.accounts where id = p_account;
  min_age := coalesce(v_min, case when v_age between 18 and 25 then greatest(18, v_age - 4) else 18 end);
  max_age := coalesce(v_max, case when v_age between 18 and 25 then v_age + 4 else 99 end);
end;
$$;

-- True when the viewer is 18–25 and the target is 30+ and outside the viewer's chosen range.
create or replace function private.age_band_hides(p_viewer uuid, p_target uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_viewer integer;
  v_target integer;
begin
  if p_viewer is null or p_target is null then return false; end if;
  v_viewer := private.member_age(p_viewer);
  if v_viewer is null or v_viewer > 25 then return false; end if;
  v_target := private.member_age(p_target);
  if v_target is null or v_target < 30 then return false; end if;
  return v_target > (private.age_window(p_viewer)).max_age;
end;
$$;

create or replace function public.profile_hidden_from_me(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_account is distinct from (select auth.uid())
    and (
      exists (
        select 1 from public.blocks b
        where (b.blocker_id = p_account and b.blocked_id = (select auth.uid()))
           or (b.blocker_id = (select auth.uid()) and b.blocked_id = p_account)
      )
      or private.age_band_hides((select auth.uid()), p_account)
      or (
        (private.has_incognito(p_account) or private.hidden_by_campus(p_account, (select auth.uid())))
        and not exists (
          select 1 from public.likes l
          join public.profiles mine on mine.id = l.profile_id
          where l.actor_id = p_account
            and mine.account_id = (select auth.uid())
            and l.kind in ('like', 'super', 'spotlight')
        )
      )
    );
$$;

create or replace function public.my_age_window()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  w record;
begin
  if v_uid is null then return null; end if;
  w := private.age_window(v_uid);
  return jsonb_build_object('age', private.member_age(v_uid), 'min', w.min_age, 'max', w.max_age);
end;
$$;

create or replace function public.set_age_window(p_min integer, p_max integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  if p_min is null or p_max is null or p_min < 18 or p_max > 99 or p_min > p_max then
    raise exception 'invalid';
  end if;
  perform set_config('soko.system', 'on', true);
  update public.accounts set show_age_min = p_min, show_age_max = p_max where id = v_uid;
  perform set_config('soko.system', 'off', true);
  return public.my_age_window();
end;
$$;

-- No paid message before a match from a 30+ member to an 18–25 member.
create or replace function private.age_band_blocks_message(p_sender uuid, p_recipient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.member_age(p_sender), 0) >= 30
     and coalesce(private.member_age(p_recipient), 0) between 18 and 25;
$$;

create or replace function public.send_intro(p_profile uuid, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_today integer;
  v_held boolean;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if coalesce(private.active_plan(v_uid), '') <> 'platinum' then
    raise exception 'platinum_required';
  end if;
  select account_id into v_owner from public.profiles where id = p_profile and status = 'live';
  if v_owner is null or v_owner = v_uid then
    raise exception 'not_found';
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = v_owner and blocked_id = v_uid) or (blocker_id = v_uid and blocked_id = v_owner)
  ) then
    raise exception 'not_found';
  end if;
  if private.age_band_blocks_message(v_uid, v_owner) then
    raise exception 'age_band';
  end if;
  select count(*) into v_today from public.intros
  where from_account = v_uid and created_at >= (private.nairobi_today()::timestamp at time zone 'Africa/Nairobi');
  if v_today >= 5 then
    raise exception 'intro_limit';
  end if;

  v_held := private.looks_like_paid_service(p_body);
  insert into public.intros (from_account, to_profile, body, held)
  values (v_uid, p_profile, trim(p_body), v_held)
  on conflict (from_account, to_profile) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'already_sent';
  end if;
  if v_held then
    insert into public.moderation_cases (target_type, target_id, status) values ('message', v_id, 'open');
  end if;

  insert into public.likes (actor_id, profile_id, kind) values (v_uid, p_profile, 'like')
  on conflict (actor_id, profile_id) do update set kind = case when likes.kind = 'pass' then 'like' else likes.kind end;

  if not v_held then
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_owner, 'like', 'Someone sent you a message', 'Open Likes You to read it.', '/likes');
  end if;
  return jsonb_build_object('id', v_id, 'held', v_held);
end;
$$;

-- Staff: accounts that liked or messaged 10+ different people at least 10 years younger in 24 hours.
create or replace function public.staff_age_gap_flags()
returns table (account_id uuid, display_name text, age integer, younger_likes bigint, younger_intros bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return query
  with recent as (
    select l.actor_id as who, p.account_id as target, 'like' as kind
    from public.likes l join public.profiles p on p.id = l.profile_id
    where l.kind <> 'pass' and l.created_at > now() - interval '24 hours'
    union all
    select i.from_account, p.account_id, 'intro'
    from public.intros i join public.profiles p on p.id = i.to_profile
    where i.created_at > now() - interval '24 hours'
  ), aged as (
    select r.who, r.target, r.kind, private.member_age(r.who) as who_age, private.member_age(r.target) as target_age
    from recent r
  )
  select a.who, acc.display_name, max(a.who_age)::int,
         count(distinct a.target) filter (where a.kind = 'like'),
         count(distinct a.target) filter (where a.kind = 'intro')
  from aged a join public.accounts acc on acc.id = a.who
  where a.who_age is not null and a.target_age is not null and a.who_age - a.target_age >= 10
  group by a.who, acc.display_name
  having count(distinct a.target) >= 10
  order by count(distinct a.target) desc;
end;
$$;

revoke all on function private.member_age(uuid) from public, anon, authenticated;
revoke all on function private.age_window(uuid) from public, anon, authenticated;
revoke all on function private.age_band_hides(uuid, uuid) from public, anon, authenticated;
revoke all on function private.age_band_blocks_message(uuid, uuid) from public, anon, authenticated;
revoke all on function public.my_age_window() from public, anon;
grant execute on function public.my_age_window() to authenticated;
revoke all on function public.set_age_window(integer, integer) from public, anon;
grant execute on function public.set_age_window(integer, integer) to authenticated;
revoke all on function public.staff_age_gap_flags() from public, anon;
grant execute on function public.staff_age_gap_flags() to authenticated;

-- 2. Rafiki vouches ----------------------------------------------------------------------------
create table if not exists public.vouches (
  voucher_id uuid not null references public.accounts (id) on delete cascade,
  vouchee_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (voucher_id, vouchee_id),
  constraint vouches_not_self check (voucher_id <> vouchee_id)
);
create index if not exists vouches_vouchee_idx on public.vouches (vouchee_id);
alter table public.vouches enable row level security;
drop policy if exists vouches_own on public.vouches;
create policy vouches_own on public.vouches
  for select using (voucher_id = (select auth.uid()) or vouchee_id = (select auth.uid()) or public.is_staff());
grant select on table public.vouches to authenticated;

create or replace function private.is_verified_member(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where account_id = p_account and is_verified)
      or exists (select 1 from public.campus_members where account_id = p_account);
$$;

create or replace function public.vouch_for(p_profile uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_target uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  perform private.assert_active(v_uid);
  if not private.is_verified_member(v_uid) then raise exception 'not_verified'; end if;
  select account_id into v_target from public.profiles where id = p_profile and status = 'live';
  if v_target is null or v_target = v_uid or public.profile_hidden_from_me(v_target) then raise exception 'not_found'; end if;
  if exists (select 1 from public.vouches where voucher_id = v_uid and vouchee_id = v_target) then
    return jsonb_build_object('ok', true);
  end if;
  if (select count(*) from public.vouches where voucher_id = v_uid) >= 5 then raise exception 'vouch_limit'; end if;
  insert into public.vouches (voucher_id, vouchee_id) values (v_uid, v_target);
  insert into public.notifications (account_id, kind, title, body, href)
  values (v_target, 'system', 'A friend vouched for you', 'It shows on your profile.', '/me');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.withdraw_vouch(p_profile uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.vouches
  where voucher_id = (select auth.uid())
    and vouchee_id = (select account_id from public.profiles where id = p_profile);
$$;

-- What a profile shows: active vouchers only, first names of those the viewer may see, up to 3.
create or replace function public.profile_vouches(p_profile uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_target uuid;
  v_uid uuid := (select auth.uid());
begin
  select account_id into v_target from public.profiles where id = p_profile and status = 'live';
  if v_target is null or public.profile_hidden_from_me(v_target) then return jsonb_build_object('count', 0, 'names', '[]'::jsonb); end if;
  return (
    with active as (
      select v.voucher_id, v.created_at
      from public.vouches v join public.accounts a on a.id = v.voucher_id
      where v.vouchee_id = v_target and not a.is_banned and a.deleted_at is null
    )
    select jsonb_build_object(
      'count', (select count(*) from active),
      'names', coalesce((
        select jsonb_agg(n) from (
          select split_part(btrim(p.display_name), ' ', 1) as n
          from active x join public.profiles p on p.account_id = x.voucher_id and p.status = 'live'
          where not public.profile_hidden_from_me(x.voucher_id)
          order by x.created_at
          limit 3
        ) s
      ), '[]'::jsonb),
      'mine', exists (select 1 from active where voucher_id = v_uid),
      'canVouch', v_uid is not null and v_uid <> v_target and private.is_verified_member(v_uid)
        and (select count(*) from public.vouches where voucher_id = v_uid) < 5
    )
  );
end;
$$;

-- A banned voucher's vouches go.
create or replace function private.drop_vouches_of_banned()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_banned and not coalesce(old.is_banned, false) then
    delete from public.vouches where voucher_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists accounts_drop_vouches on public.accounts;
create trigger accounts_drop_vouches after update of is_banned on public.accounts
for each row execute function private.drop_vouches_of_banned();

-- Staff: vouches between accounts that are both under 14 days old (possible rings).
create or replace function public.staff_vouch_rings()
returns table (voucher_id uuid, voucher_name text, vouchee_id uuid, vouchee_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  return query
  select v.voucher_id, a.display_name, v.vouchee_id, b.display_name, v.created_at
  from public.vouches v
  join public.accounts a on a.id = v.voucher_id
  join public.accounts b on b.id = v.vouchee_id
  where a.created_at > now() - interval '14 days' and b.created_at > now() - interval '14 days'
  order by v.created_at desc
  limit 200;
end;
$$;

revoke all on function private.is_verified_member(uuid) from public, anon, authenticated;
revoke all on function private.drop_vouches_of_banned() from public, anon, authenticated;
revoke all on function public.vouch_for(uuid) from public, anon;
grant execute on function public.vouch_for(uuid) to authenticated;
revoke all on function public.withdraw_vouch(uuid) from public, anon;
grant execute on function public.withdraw_vouch(uuid) to authenticated;
revoke all on function public.profile_vouches(uuid) from public;
grant execute on function public.profile_vouches(uuid) to anon, authenticated;
revoke all on function public.staff_vouch_rings() from public, anon;
grant execute on function public.staff_vouch_rings() to authenticated;
