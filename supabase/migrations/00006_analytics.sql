-- Analytics: impressions and likes write daily stats. Staff may count impressions.
-- Revenue stays on ledger payment rows. Do not store message bodies.

create policy impressions_staff_select on public.profile_impressions
  for select
  using (public.is_staff());

create index if not exists profile_impressions_created_idx
  on public.profile_impressions (created_at desc);

create or replace function private.nairobi_today()
returns date
language sql
stable
as $$
  select timezone('Africa/Nairobi', now())::date;
$$;

create or replace function private.bump_daily_stat(
  p_profile uuid,
  p_views int,
  p_likes int,
  p_matches int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_daily_stats (profile_id, day, views, likes, matches)
  values (p_profile, private.nairobi_today(), p_views, p_likes, p_matches)
  on conflict (profile_id, day) do update set
    views = public.profile_daily_stats.views + excluded.views,
    likes = public.profile_daily_stats.likes + excluded.likes,
    matches = public.profile_daily_stats.matches + excluded.matches;
end;
$$;

create or replace function private.record_impression_stat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.bump_daily_stat(new.profile_id, 1, 0, 0);
  return new;
end;
$$;

create trigger impressions_daily_stats
after insert on public.profile_impressions
for each row execute function private.record_impression_stat();

create or replace function private.record_like_stat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind in ('like', 'spotlight')
     and (tg_op = 'INSERT' or old.kind = 'pass')
  then
    perform private.bump_daily_stat(new.profile_id, 0, 1, 0);
  end if;
  return new;
end;
$$;

create trigger likes_daily_stats
after insert or update of kind on public.likes
for each row execute function private.record_like_stat();

create or replace function private.record_match_stat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.bump_daily_stat(new.profile_id, 0, 0, 1);
  return new;
end;
$$;

create trigger matches_daily_stats
after insert on public.matches
for each row execute function private.record_match_stat();

revoke all on function private.nairobi_today() from public, anon, authenticated;
revoke all on function private.bump_daily_stat(uuid, int, int, int) from public, anon, authenticated;
revoke all on function private.record_impression_stat() from public, anon, authenticated;
revoke all on function private.record_like_stat() from public, anon, authenticated;
revoke all on function private.record_match_stat() from public, anon, authenticated;
