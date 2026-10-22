-- Privacy and safety fixes from a security review.
--
-- 1. Photos: a member can only attach files from their own storage folder, and approved photos
--    are only readable for live profiles the viewer is allowed to see (was: every approved row,
--    including incognito and campus-hidden members, readable by anyone).
-- 2. Under-18: the ban now sticks (it used to be rolled back by the exception that followed it,
--    and the column guard silently undid it anyway), and members can no longer write their own
--    date_of_birth / age_confirmed_at to skip the age gate.
-- 3. Blocks: blocking hides both people from each other everywhere profile visibility is decided
--    (Discover, Browse, profile pages), and a blocked or hidden profile can't be liked.

-- 1. Photos ------------------------------------------------------------------------------------
create or replace function private.guard_media_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff()
     or coalesce(current_setting('soko.system', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- Only files from your own folder ("<your id>/...").
    if split_part(coalesce(new.storage_path, ''), '/', 1) <> (select auth.uid())::text then
      raise exception 'forbidden';
    end if;
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

alter policy media_select on public.profile_media
  using (
    (
      status = 'approved'
      and exists (
        select 1 from public.profiles p
        where p.id = profile_media.profile_id
          and p.status = 'live'
          and not public.profile_hidden_from_me(p.account_id)
      )
    )
    or exists (select 1 from public.profiles p where p.id = profile_media.profile_id and p.account_id = (select auth.uid()))
    or public.is_staff()
  );

-- 2. Age ---------------------------------------------------------------------------------------
create or replace function private.guard_account_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff()
     or coalesce(current_setting('soko.system', true), '') = 'on' then
    return new;
  end if;
  new.is_banned := old.is_banned;
  new.deleted_at := old.deleted_at;
  new.role := old.role;
  new.invite_code := old.invite_code;
  new.founding_member := old.founding_member;
  new.is_test := old.is_test;
  -- Only record_consents (with its 18+ check) may set these.
  new.date_of_birth := old.date_of_birth;
  new.age_confirmed_at := old.age_confirmed_at;
  return new;
end;
$$;

create or replace function public.record_consents(p_version text, p_date_of_birth date, p_sensitive boolean, p_marketing boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  perform set_config('soko.system', 'on', true);
  if p_date_of_birth is null or p_date_of_birth > (current_date - interval '18 years')::date then
    -- Return instead of raising, so the ban is actually saved.
    update public.accounts set is_banned = true where id = v_uid;
    update public.profiles set status = 'suspended' where account_id = v_uid;
    perform set_config('soko.system', 'off', true);
    return jsonb_build_object('error', 'underage');
  end if;
  if p_date_of_birth < date '1920-01-01' then raise exception 'invalid_dob'; end if;
  update public.accounts
  set date_of_birth = coalesce(date_of_birth, p_date_of_birth),
      age_confirmed_at = coalesce(age_confirmed_at, now())
  where id = v_uid;
  perform set_config('soko.system', 'off', true);
  insert into public.consents (account_id, kind, version, granted) values
    (v_uid, 'terms', p_version, true),
    (v_uid, 'privacy', p_version, true),
    (v_uid, 'sensitive_data', p_version, coalesce(p_sensitive, false)),
    (v_uid, 'marketing', p_version, coalesce(p_marketing, false));
  return public.my_consents();
end;
$$;

-- 3. Blocks ------------------------------------------------------------------------------------
create or replace function public.profile_hidden_from_me(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_account is distinct from (select auth.uid())
    and (
      -- A block, either way, always hides.
      exists (
        select 1 from public.blocks b
        where (b.blocker_id = p_account and b.blocked_id = (select auth.uid()))
           or (b.blocker_id = (select auth.uid()) and b.blocked_id = p_account)
      )
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

-- You can only like (or pass on) a live profile you're allowed to see.
alter policy likes_insert_own on public.likes
  with check (
    actor_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = likes.profile_id
        and p.status = 'live'
        and not public.profile_hidden_from_me(p.account_id)
    )
  );
