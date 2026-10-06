-- "Hide me from my campus": a verified student can disappear for other verified students at the
-- same campus (Discover, Browse, profile links) — free, because coursemates are the people most
-- students worry about. Same exception as Incognito: anyone they've already liked still sees them.
-- Fair play: while hidden, their own campus deck is off (enforced in the app's /api/discover).

alter table public.campus_members add column if not exists hide_from_campus boolean not null default false;

grant select (hide_from_campus) on table public.campus_members to authenticated;
grant update (show_on_profile, hide_from_campus) on table public.campus_members to authenticated;

-- True when p_account hides from their campus and p_viewer is verified at the same campus.
create or replace function private.hidden_by_campus(p_account uuid, p_viewer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_viewer is not null and exists (
    select 1
    from public.campus_members them
    join public.campus_members me on me.campus_id = them.campus_id
    where them.account_id = p_account
      and them.hide_from_campus
      and me.account_id = p_viewer
  );
$$;

create or replace function public.profile_hidden_from_me(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_account is distinct from (select auth.uid())
    and (private.has_incognito(p_account) or private.hidden_by_campus(p_account, (select auth.uid())))
    and not exists (
      select 1 from public.likes l
      join public.profiles mine on mine.id = l.profile_id
      where l.actor_id = p_account
        and mine.account_id = (select auth.uid())
        and l.kind in ('like', 'super', 'spotlight')
    );
$$;

create or replace function public.my_campus()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'slug', c.slug,
    'name', c.name,
    'shortName', c.short_name,
    'status', c.status,
    'joined', (select count(*) from public.campus_members x where x.campus_id = c.id),
    'target', c.unlock_target,
    'showOnProfile', m.show_on_profile,
    'hideFromCampus', m.hide_from_campus,
    'method', m.method,
    'verifiedAt', m.verified_at
  )
  from public.campus_members m join public.campuses c on c.id = m.campus_id
  where m.account_id = (select auth.uid());
$$;

revoke all on function public.my_campus() from public, anon;
grant execute on function public.my_campus() to authenticated;
revoke all on function public.profile_hidden_from_me(uuid) from public;
grant execute on function public.profile_hidden_from_me(uuid) to anon, authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
