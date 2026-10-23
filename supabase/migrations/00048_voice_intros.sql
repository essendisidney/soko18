-- K2c: voice intros. A 15-second clip on the profile, recorded in the app in any language.
--
-- The phone records Opus, mono, about 24 kbps (Safari falls back to AAC), so a clip is ~50 KB.
-- Every clip waits for staff review before anyone hears it: there's no cheap, reliable Kiswahili /
-- Sheng transcription to run the paid-services filter on, so a person listens instead. Clips live
-- in a private bucket and are only ever served as short-lived signed links, to people who can see
-- the profile. Profiles with an approved clip rank slightly higher in the daily drop.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', false, 307200, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/mpeg'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists voice_insert_own_folder on storage.objects;
create policy voice_insert_own_folder on storage.objects
  for insert to authenticated
  with check (bucket_id = 'voice' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists voice_select_own_or_staff on storage.objects;
create policy voice_select_own_or_staff on storage.objects
  for select to authenticated
  using (bucket_id = 'voice' and ((storage.foldername(name))[1] = (select auth.uid()::text) or public.is_staff()));

drop policy if exists voice_delete_own_folder on storage.objects;
create policy voice_delete_own_folder on storage.objects
  for delete to authenticated
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = (select auth.uid()::text));

create table if not exists public.profile_voice (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  storage_path text not null,
  duration_ms integer not null check (duration_ms between 1000 and 15500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.accounts (id) on delete set null
);
create index if not exists profile_voice_pending_idx on public.profile_voice (created_at) where status = 'pending';

alter table public.profile_voice enable row level security;
drop policy if exists profile_voice_own on public.profile_voice;
create policy profile_voice_own on public.profile_voice
  for select using (account_id = (select auth.uid()) or public.is_staff());
grant select on table public.profile_voice to authenticated;

-- The member saves a clip they've uploaded to their own folder. A new clip waits for review again.
create or replace function public.submit_voice(p_path text, p_duration_ms integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  perform private.assert_active(v_uid);
  if p_path is null or p_path !~ ('^' || v_uid::text || '/[0-9a-f-]{36}\.(webm|ogg|m4a|mp4|aac|mp3)$') then
    raise exception 'invalid';
  end if;
  if p_duration_ms is null or p_duration_ms not between 1000 and 15500 then raise exception 'too_long'; end if;
  select id into v_profile from public.profiles where account_id = v_uid;
  if v_profile is null then raise exception 'no_profile'; end if;
  insert into public.profile_voice (profile_id, account_id, storage_path, duration_ms, status)
  values (v_profile, v_uid, p_path, p_duration_ms, 'pending')
  on conflict (profile_id) do update
  set storage_path = excluded.storage_path, duration_ms = excluded.duration_ms, status = 'pending',
      created_at = now(), reviewed_at = null, reviewed_by = null;
  return jsonb_build_object('status', 'pending');
end;
$$;

create or replace function public.remove_voice()
returns void language sql security definer set search_path = public as $$
  delete from public.profile_voice where account_id = (select auth.uid());
$$;

-- Staff approve or reject a clip. The member hears back either way.
create or replace function public.review_voice(p_profile uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  update public.profile_voice
  set status = case when p_approve then 'approved' else 'rejected' end, reviewed_at = now(), reviewed_by = (select auth.uid())
  where profile_id = p_profile
  returning account_id into v_account;
  if v_account is null then raise exception 'not_found'; end if;
  insert into public.notifications (account_id, kind, title, body, href)
  values (v_account, 'moderation',
          case when p_approve then 'Your voice intro is live' else 'Your voice intro wasn''t approved' end,
          case when p_approve then 'People can hear it on your profile now.' else 'Record a new one: keep it about you, no offers or contact details.' end,
          '/studio/profile');
end;
$$;

-- Where an approved clip lives, for someone allowed to see the profile. The server signs it.
create or replace function public.profile_voice_path(p_profile uuid)
returns text language sql stable security definer set search_path = public as $$
  select pv.storage_path
  from public.profile_voice pv
  join public.profiles p on p.id = pv.profile_id
  where pv.profile_id = p_profile
    and (
      p.account_id = (select auth.uid())
      or (pv.status = 'approved' and p.status = 'live' and p.flagged_reason is null and not public.profile_hidden_from_me(p.account_id))
    );
$$;

-- Same as 00047, plus a small lift for an approved voice intro.
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

revoke all on function public.submit_voice(text, integer) from public, anon;
grant execute on function public.submit_voice(text, integer) to authenticated;
revoke all on function public.remove_voice() from public, anon;
grant execute on function public.remove_voice() to authenticated;
revoke all on function public.review_voice(uuid, boolean) from public, anon;
grant execute on function public.review_voice(uuid, boolean) to authenticated;
revoke all on function public.profile_voice_path(uuid) from public;
grant execute on function public.profile_voice_path(uuid) to anon, authenticated;
revoke all on function private.drop_candidates(uuid, integer) from public, anon, authenticated;
