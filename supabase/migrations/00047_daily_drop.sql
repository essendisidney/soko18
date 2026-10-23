-- K2b: the daily drop. At 20:00 in each member's market clock they get a small set of picks
-- (7, Gold and Platinum 10) next to the normal deck. Picks last until the next drop.
--
-- Ranked from intent, area, shared vouchers, activity and Looking-for tags. Never padded: only
-- real (not test), active, live, visible people the member hasn't liked, passed or matched, who
-- fit both members' "Show me" and the viewer's age range. A thin market gets a smaller drop, and
-- nobody gets a push for an empty one. Picks don't repeat within 14 days.

insert into private.settings (key, value) values
  ('drop_size', '7'),
  ('drop_gold_extra', '3'),
  ('drop_hour', '20'),
  ('drop_active_days', '14')
on conflict (key) do nothing;

create table if not exists public.drop_picks (
  account_id uuid not null references public.accounts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  drop_date date not null,
  rank smallint not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (account_id, drop_date, profile_id)
);
create index if not exists drop_picks_current_idx on public.drop_picks (account_id, expires_at desc);
create index if not exists drop_picks_profile_idx on public.drop_picks (profile_id);

alter table public.drop_picks enable row level security;
drop policy if exists drop_picks_own on public.drop_picks;
create policy drop_picks_own on public.drop_picks
  for select using (account_id = (select auth.uid()) or public.is_staff());
grant select on table public.drop_picks to authenticated;

-- "Show me" is saved on the account (Discover's filter) so the drop can respect it.
create or replace function public.set_show_me(p_show text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null then raise exception 'unauthorized'; end if;
  if p_show not in ('woman', 'man', 'any') then raise exception 'invalid'; end if;
  perform set_config('soko.system', 'on', true);
  update public.accounts
  set show_me = case p_show when 'any' then array['man', 'woman', 'nonbinary'] else array[p_show] end
  where id = (select auth.uid());
  perform set_config('soko.system', 'off', true);
end;
$$;

-- The picks for one member. Call with request.jwt.claims set to that member, so the same hiding
-- rules as Discover (blocks, Incognito, campus, age bands) apply through profile_hidden_from_me.
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
  from me
  join public.profiles p on p.city_id = me.city_id and p.status = 'live' and p.flagged_reason is null
  join public.accounts a on a.id = p.account_id
  where p.account_id <> p_viewer
    and not a.is_test and not a.is_banned and a.deleted_at is null
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

-- Cron (hourly-safe): builds today's drop for members whose market clock is in the drop hour.
-- Each member gets at most one drop per local day. p_force skips the hour check (tests only).
create or replace function public.run_daily_drops(p_force boolean default false)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_member record;
  v_size integer;
  v_count integer;
  v_total integer := 0;
  v_hour integer := private.setting_int('drop_hour', 20);
begin
  for v_member in
    select a.id, m.timezone as tz, (now() at time zone m.timezone)::date as local_date
    from public.accounts a
    join public.markets m on m.country_code = coalesce(a.country_code, 'KE') and m.status = 'live'
    join public.profiles p on p.account_id = a.id and p.status = 'live'
    where not a.is_test and not a.is_banned and a.deleted_at is null
      and a.last_seen_at > now() - interval '30 days'
      and (p_force or extract(hour from now() at time zone m.timezone) = v_hour)
      and not exists (
        select 1 from public.drop_picks d
        where d.account_id = a.id and d.drop_date = (now() at time zone m.timezone)::date
      )
    limit 5000
  loop
    v_size := private.setting_int('drop_size', 7)
      + case when private.active_plan(v_member.id) is not null then private.setting_int('drop_gold_extra', 3) else 0 end;
    perform set_config('request.jwt.claims', jsonb_build_object('sub', v_member.id, 'role', 'authenticated')::text, true);
    insert into public.drop_picks (account_id, profile_id, drop_date, rank, expires_at)
    select v_member.id, c.profile_id, v_member.local_date, row_number() over (order by c.score desc)::smallint,
           ((v_member.local_date + 1)::timestamp + make_interval(hours => v_hour)) at time zone v_member.tz
    from private.drop_candidates(v_member.id, v_size) c;
    get diagnostics v_count = row_count;
    perform set_config('request.jwt.claims', '', true);
    if v_count > 0 then
      insert into public.notifications (account_id, kind, title, body, href)
      values (v_member.id, 'system', case when v_count = 1 then 'Your pick is in' else 'Your ' || v_count || ' are in' end,
              'Today''s picks, here until tomorrow at 8pm.', '/drop');
      v_total := v_total + 1;
    end if;
  end loop;
  return v_total;
end;
$$;

-- My current drop: picks still visible to me, with whether I've already acted on them.
create or replace function public.my_drop()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'expiresAt', max(d.expires_at),
    'picks', coalesce(jsonb_agg(jsonb_build_object(
      'profileId', c.id, 'slug', c.slug, 'name', c.display_name,
      'age', private.member_age((select account_id from public.profiles where id = c.id)),
      'area', coalesce(c.area_name, c.city_name), 'verified', c.is_verified, 'lookingFor', c.looking_for,
      'acted', exists (select 1 from public.likes l where l.actor_id = (select auth.uid()) and l.profile_id = c.id)
    ) order by d.rank) filter (where c.id is not null), '[]'::jsonb)
  )
  from public.drop_picks d
  left join public.live_profile_cards c on c.id = d.profile_id
  where d.account_id = (select auth.uid()) and d.expires_at > now();
$$;

revoke all on function public.set_show_me(text) from public, anon;
grant execute on function public.set_show_me(text) to authenticated;
revoke all on function private.drop_candidates(uuid, integer) from public, anon, authenticated;
revoke all on function public.run_daily_drops(boolean) from public, anon, authenticated;
grant execute on function public.run_daily_drops(boolean) to service_role;
revoke all on function public.my_drop() from public, anon;
grant execute on function public.my_drop() to authenticated;
