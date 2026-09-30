-- Guards only restrict signed-in members. SQL console / service role (no auth.uid()) is trusted.
create or replace function private.guard_account_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff() then return new; end if;
  new.is_banned := old.is_banned;
  new.deleted_at := old.deleted_at;
  new.role := old.role;
  return new;
end;
$$;

create or replace function private.guard_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff() or coalesce(current_setting('soko.paid_ok', true), '') = 'on' then
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

create or replace function private.guard_media_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff() then return new; end if;
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

revoke execute on all functions in schema private from public, anon, authenticated;
