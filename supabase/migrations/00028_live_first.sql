-- Live first, reviewed after.
-- A profile goes live by itself as soon as it has a name, area, gender, what they're looking for
-- and at least one photo. Photos show as soon as they're uploaded. Staff check new profiles and
-- photos afterwards from the same Admin queue and can take them down. Members can never make
-- themselves live while flagged, suspended or removed.

alter table public.profiles add column if not exists checked_at timestamptz;

-- Everything already approved by a human counts as checked.
update public.profiles set checked_at = coalesce(checked_at, now()) where status = 'live';
update public.profile_media set reviewed_at = coalesce(reviewed_at, now()) where status = 'approved';

create or replace function private.profile_ready(p public.profiles)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(btrim(p.display_name), '') <> ''
     and p.area_id is not null
     and p.gender is not null
     and p.looking_for is not null
     and p.flagged_reason is null
     and exists (select 1 from public.profile_media m where m.profile_id = p.id and m.status = 'approved');
$$;

-- Owners can't touch review columns. System updates (our own triggers) pass through.
create or replace function private.guard_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff()
     or coalesce(current_setting('soko.paid_ok', true), '') = 'on'
     or coalesce(current_setting('soko.system', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.verified_at := null;
    new.published_at := null;
    new.quality_score := 0;
    new.checked_at := null;
    return new;
  end if;
  new.is_verified := old.is_verified;
  new.verified_at := old.verified_at;
  new.published_at := old.published_at;
  new.quality_score := old.quality_score;
  new.checked_at := old.checked_at;
  return new;
end;
$$;

-- The status a member's save ends in is decided here, not by the app.
create or replace function private.owner_profile_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff()
     or coalesce(current_setting('soko.system', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('suspended', 'removed') then
    new.status := old.status;
    return new;
  end if;
  if new.status = 'paused' then
    return new;
  end if;
  if new.flagged_reason is not null then
    new.status := 'pending_review';
    return new;
  end if;
  if private.profile_ready(new) then
    new.status := 'live';
    new.published_at := case when tg_op = 'UPDATE' then coalesce(old.published_at, now()) else now() end;
  else
    new.status := 'draft';
  end if;
  return new;
end;
$$;

create or replace trigger profiles_zz_owner_status
before insert or update on public.profiles
for each row execute function private.owner_profile_status();

alter policy profiles_insert_own on public.profiles
  with check (account_id = auth.uid() and status in ('draft', 'pending_review', 'live'));

alter policy profiles_update_own on public.profiles
  using (account_id = auth.uid())
  with check (account_id = auth.uid() and status in ('draft', 'pending_review', 'paused', 'live'));

-- Tell the member the first time they go live on their own.
create or replace function private.profile_went_live()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'live'
     and (tg_op = 'INSERT' or (old.status is distinct from 'live' and old.published_at is null))
     and new.checked_at is null
     and not public.is_staff() then
    insert into public.notifications (account_id, kind, title, body, href)
    values (new.account_id, 'moderation', 'You’re live 🎉', 'People near you can see you now. Start liking!', '/discover');
  end if;
  return new;
end;
$$;

create or replace trigger profiles_went_live
after insert or update on public.profiles
for each row execute function private.profile_went_live();

-- Photos show as soon as they're uploaded; the first one becomes the main photo.
create or replace function private.guard_media_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff()
     or coalesce(current_setting('soko.system', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'approved';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.is_cover := not exists (
      select 1 from public.profile_media
      where profile_id = new.profile_id and status = 'approved' and is_cover
    );
    return new;
  end if;
  new.status := old.status;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.storage_path := old.storage_path;
  new.profile_id := old.profile_id;
  return new;
end;
$$;

alter policy media_insert_own on public.profile_media
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = auth.uid())
    and status in ('uploaded', 'approved')
  );

-- When photos change, keep one main photo and keep the profile's status honest:
-- the last photo gone takes a live profile down; the first photo on a finished draft puts it live.
create or replace function private.media_recheck_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := coalesce(new.profile_id, old.profile_id);
  p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = v_profile;
  if not found then return null; end if;

  perform set_config('soko.system', 'on', true);
  if not exists (select 1 from public.profile_media where profile_id = v_profile and status = 'approved' and is_cover) then
    update public.profile_media set is_cover = true
    where id = (
      select id from public.profile_media
      where profile_id = v_profile and status = 'approved'
      order by sort_order, created_at limit 1
    );
  end if;
  if p.status = 'live' and not private.profile_ready(p) then
    update public.profiles set status = 'draft' where id = v_profile;
  elsif p.status = 'draft' and private.profile_ready(p) then
    update public.profiles set status = 'live', published_at = coalesce(published_at, now()) where id = v_profile;
  end if;
  perform set_config('soko.system', 'off', true);
  return null;
end;
$$;

create or replace trigger profile_media_recheck
after insert or update of status or delete on public.profile_media
for each row execute function private.media_recheck_profile();

-- Staff review is now a check after the fact.
create or replace function public.staff_review_profile(p_profile uuid, p_approve boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
  v_status public.profile_status;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  select account_id, status into v_account, v_status from public.profiles where id = p_profile;
  if v_account is null then raise exception 'not_found'; end if;
  if p_approve then
    if not exists (select 1 from public.profile_media where profile_id = p_profile and status = 'approved') then
      raise exception 'needs_approved_photo';
    end if;
    update public.profiles
    set status = 'live', flagged_reason = null, checked_at = now(), published_at = coalesce(published_at, now())
    where id = p_profile;
    if v_status <> 'live' then
      insert into public.notifications (account_id, kind, title, body, href)
      values (v_account, 'moderation', 'You’re live 🎉', 'Your profile is showing on Discover.', '/discover');
    end if;
  else
    -- Taken down: stays out until a person looks again.
    update public.profiles set status = 'draft', flagged_reason = 'needs_changes', checked_at = now() where id = p_profile;
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_account, 'moderation', 'Your profile needs a change', coalesce(p_note, 'Please update your profile. We’ll look again.'), '/studio/profile');
  end if;
  update public.moderation_cases set status = 'resolved'
  where target_type = 'profile' and target_id = p_profile and status <> 'resolved';
  perform private.audit(case when p_approve then 'profile.approve' else 'profile.reject' end, 'profiles', p_profile,
                        jsonb_build_object('note', p_note));
  return jsonb_build_object('id', p_profile, 'approved', p_approve);
end;
$$;

revoke execute on function private.profile_ready(public.profiles) from public, anon, authenticated;
revoke execute on function private.owner_profile_status() from public, anon, authenticated;
revoke execute on function private.profile_went_live() from public, anon, authenticated;
revoke execute on function private.media_recheck_profile() from public, anon, authenticated;

-- Members who finished their profile but were stuck waiting go live now.
do $$
begin
  perform set_config('soko.system', 'on', true);
  update public.profiles p set status = 'live', published_at = coalesce(published_at, now())
  where p.status in ('draft', 'pending_review') and private.profile_ready(p)
    and not exists (select 1 from public.accounts a where a.id = p.account_id and a.is_test);
  perform set_config('soko.system', 'off', true);
end $$;
