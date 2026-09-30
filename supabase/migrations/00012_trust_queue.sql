-- Launch-ready trust: real photo pipeline, selfie verification, one staff queue.

-- ---------------------------------------------------------------------------
-- Members can't grant themselves trust signals.
-- ---------------------------------------------------------------------------

create or replace function private.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() or coalesce(current_setting('soko.paid_ok', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.verified_at := null;
    new.published_at := null;
    new.quality_score := 0;
    return new;
  end if;
  new.is_verified := old.is_verified;
  new.verified_at := old.verified_at;
  new.published_at := old.published_at;
  new.quality_score := old.quality_score;
  return new;
end;
$$;

drop trigger if exists profiles_guard_columns on public.profiles;
create trigger profiles_guard_columns
before insert or update on public.profiles
for each row execute function private.guard_profile_columns();

-- Members can't approve their own photos or flip cover on someone else's.
create or replace function private.guard_media_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'uploaded';
    new.reviewed_by := null;
    new.reviewed_at := null;
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

drop trigger if exists profile_media_guard_columns on public.profile_media;
create trigger profile_media_guard_columns
before insert or update on public.profile_media
for each row execute function private.guard_media_columns();

-- Members can remove their own photos and set sort order / cover.
drop policy if exists media_update_own on public.profile_media;
create policy media_update_own on public.profile_media
  for update using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = (select auth.uid()))
  );

drop policy if exists media_delete_own on public.profile_media;
create policy media_delete_own on public.profile_media
  for delete using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Selfie verification: pose challenge + private evidence bucket
-- ---------------------------------------------------------------------------

alter table public.verification_records
  add column if not exists challenge text,
  add column if not exists note text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification', 'verification', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists verification_insert_own_folder on storage.objects;
create policy verification_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists verification_select_staff on storage.objects;
create policy verification_select_staff on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification'
    and ((storage.foldername(name))[1] = (select auth.uid()::text) or public.is_staff())
  );

create or replace function public.start_selfie_check()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile uuid;
  v_id uuid;
  v_challenge text;
  v_poses text[] := array[
    'Hold up two fingers next to your face',
    'Touch your left ear',
    'Give a thumbs up under your chin',
    'Cover one eye with your hand',
    'Point at the camera with your right hand',
    'Put your hand flat on top of your head'
  ];
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  select id into v_profile from public.profiles where account_id = v_uid;
  if v_profile is null then
    raise exception 'no_profile';
  end if;

  -- Reuse an open check so refreshing doesn't pile up rows.
  select id, challenge into v_id, v_challenge
  from public.verification_records
  where account_id = v_uid and kind = 'profile' and status = 'pending' and evidence_path is null
  order by created_at desc
  limit 1;

  if v_id is null then
    v_challenge := v_poses[1 + floor(random() * array_length(v_poses, 1))::int];
    insert into public.verification_records (account_id, profile_id, kind, status, challenge, provider)
    values (v_uid, v_profile, 'profile', 'pending', v_challenge, 'selfie')
    returning id into v_id;
  end if;

  return jsonb_build_object('id', v_id, 'challenge', v_challenge);
end;
$$;

create or replace function public.submit_selfie(p_id uuid, p_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if split_part(p_path, '/', 1) <> v_uid::text then
    raise exception 'forbidden';
  end if;
  update public.verification_records
  set evidence_path = p_path
  where id = p_id and account_id = v_uid and status = 'pending' and kind = 'profile';
  if not found then
    raise exception 'not_found';
  end if;
  return jsonb_build_object('id', p_id, 'status', 'pending');
end;
$$;

create or replace function public.my_verification()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_build_object('status', v.status, 'challenge', v.challenge, 'submitted', v.evidence_path is not null, 'note', v.note)
     from public.verification_records v
     where v.account_id = (select auth.uid()) and v.kind = 'profile'
     order by v.created_at desc limit 1),
    jsonb_build_object('status', 'none')
  );
$$;

revoke all on function public.start_selfie_check() from public, anon;
revoke all on function public.submit_selfie(uuid, text) from public, anon;
revoke all on function public.my_verification() from public, anon;
grant execute on function public.start_selfie_check() to authenticated;
grant execute on function public.submit_selfie(uuid, text) to authenticated;
grant execute on function public.my_verification() to authenticated;

-- ---------------------------------------------------------------------------
-- Staff decisions. Every one writes the audit log.
-- ---------------------------------------------------------------------------

create or replace function private.audit(p_action text, p_entity text, p_id uuid, p_meta jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values ((select auth.uid()), p_action, p_entity, p_id, coalesce(p_meta, '{}'::jsonb));
$$;

create or replace function public.staff_review_media(p_media uuid, p_approve boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_media public.profile_media%rowtype;
  v_has_cover boolean;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  select * into v_media from public.profile_media where id = p_media for update;
  if not found then
    raise exception 'not_found';
  end if;

  if p_approve then
    select exists (
      select 1 from public.profile_media
      where profile_id = v_media.profile_id and is_cover and status = 'approved' and id <> v_media.id
    ) into v_has_cover;
    update public.profile_media
    set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now(),
        is_cover = case when v_has_cover then is_cover else true end
    where id = p_media;
  else
    update public.profile_media
    set status = 'rejected', reviewed_by = (select auth.uid()), reviewed_at = now(),
        rejection_reason = left(p_note, 200), is_cover = false
    where id = p_media;
  end if;

  perform private.audit(case when p_approve then 'media.approve' else 'media.reject' end, 'profile_media', p_media,
                        jsonb_build_object('note', p_note));
  return jsonb_build_object('id', p_media, 'approved', p_approve);
end;
$$;

create or replace function public.staff_review_profile(p_profile uuid, p_approve boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  select account_id into v_account from public.profiles where id = p_profile;
  if v_account is null then
    raise exception 'not_found';
  end if;

  if p_approve then
    if not exists (
      select 1 from public.profile_media where profile_id = p_profile and status = 'approved' and is_cover
    ) then
      raise exception 'needs_approved_photo';
    end if;
    update public.profiles
    set status = 'live', flagged_reason = null, published_at = coalesce(published_at, now())
    where id = p_profile;
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_account, 'moderation', 'You’re live', 'Your profile is approved and showing on Discover.', '/discover');
  else
    update public.profiles set status = 'draft' where id = p_profile;
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_account, 'moderation', 'Profile needs changes', coalesce(p_note, 'Please update your profile and resubmit.'), '/studio/profile');
  end if;

  update public.moderation_cases set status = 'resolved'
  where target_type = 'profile' and target_id = p_profile and status <> 'resolved';

  perform private.audit(case when p_approve then 'profile.approve' else 'profile.reject' end, 'profiles', p_profile,
                        jsonb_build_object('note', p_note));
  return jsonb_build_object('id', p_profile, 'approved', p_approve);
end;
$$;

create or replace function public.staff_review_verification(p_record uuid, p_approve boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.verification_records%rowtype;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  select * into v_rec from public.verification_records where id = p_record for update;
  if not found or v_rec.status <> 'pending' then
    raise exception 'not_found';
  end if;

  update public.verification_records
  set status = case when p_approve then 'verified'::public.verification_status else 'rejected'::public.verification_status end,
      decided_by = (select auth.uid()), decided_at = now(), note = left(p_note, 200)
  where id = p_record;

  if p_approve and v_rec.profile_id is not null then
    update public.profiles set is_verified = true, verified_at = now() where id = v_rec.profile_id;
  end if;

  insert into public.notifications (account_id, kind, title, body, href)
  values (v_rec.account_id, 'moderation',
          case when p_approve then 'You’re verified' else 'Verification didn’t pass' end,
          case when p_approve then 'Your blue check is live.' else coalesce(p_note, 'Try again with a clear, well-lit selfie doing the pose.') end,
          '/me');

  perform private.audit(case when p_approve then 'verification.approve' else 'verification.reject' end,
                        'verification_records', p_record, jsonb_build_object('note', p_note));
  return jsonb_build_object('id', p_record, 'approved', p_approve);
end;
$$;

-- release: clear the hold. remove: take the profile down / keep the message held. ban: ban the account.
create or replace function public.staff_resolve_case(p_case uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.moderation_cases%rowtype;
  v_account uuid;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  if p_action not in ('release', 'remove', 'ban') then
    raise exception 'invalid';
  end if;
  select * into v_case from public.moderation_cases where id = p_case for update;
  if not found then
    raise exception 'not_found';
  end if;

  if v_case.target_type = 'profile' then
    select account_id into v_account from public.profiles where id = v_case.target_id;
    if p_action = 'release' then
      update public.profiles set flagged_reason = null where id = v_case.target_id;
    elsif p_action = 'remove' then
      update public.profiles set status = 'removed' where id = v_case.target_id;
    end if;
  elsif v_case.target_type = 'message' then
    select sender_id into v_account from public.messages where id = v_case.target_id;
    if p_action = 'release' then
      update public.messages set held = false where id = v_case.target_id;
    end if;
  elsif v_case.target_type = 'account' then
    v_account := v_case.target_id;
  elsif v_case.target_type = 'media' then
    select p.account_id into v_account
    from public.profile_media m join public.profiles p on p.id = m.profile_id
    where m.id = v_case.target_id;
    if p_action = 'remove' then
      update public.profile_media set status = 'removed', is_cover = false where id = v_case.target_id;
    end if;
  end if;

  if p_action = 'ban' and v_account is not null then
    update public.accounts set is_banned = true where id = v_account;
    update public.profiles set status = 'suspended' where account_id = v_account;
  end if;

  update public.moderation_cases set status = 'resolved', assigned_to = (select auth.uid()) where id = p_case;
  insert into public.moderation_actions (case_id, actor_id, decision, note)
  values (p_case, (select auth.uid()),
          case p_action when 'release' then 'approve' when 'remove' then 'remove' else 'ban' end::public.moderation_decision,
          left(p_note, 280));

  perform private.audit('case.' || p_action, 'moderation_cases', p_case,
                        jsonb_build_object('target_type', v_case.target_type, 'target_id', v_case.target_id, 'note', p_note));
  return jsonb_build_object('id', p_case, 'action', p_action, 'accountId', v_account);
end;
$$;

revoke all on function public.staff_review_media(uuid, boolean, text) from public, anon;
revoke all on function public.staff_review_profile(uuid, boolean, text) from public, anon;
revoke all on function public.staff_review_verification(uuid, boolean, text) from public, anon;
revoke all on function public.staff_resolve_case(uuid, text, text) from public, anon;
grant execute on function public.staff_review_media(uuid, boolean, text) to authenticated;
grant execute on function public.staff_review_profile(uuid, boolean, text) to authenticated;
grant execute on function public.staff_review_verification(uuid, boolean, text) to authenticated;
grant execute on function public.staff_resolve_case(uuid, text, text) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
