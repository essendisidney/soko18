-- Security hardening: private media bucket, own-account soft delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_insert_own_folder on storage.objects;
drop policy if exists media_update_own_folder on storage.objects;
drop policy if exists media_select_own_folder on storage.objects;
drop policy if exists media_delete_own_folder on storage.objects;

create policy media_insert_own_folder on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy media_update_own_folder on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy media_select_own_folder on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid()::text)
      or public.is_staff()
    )
  );

create policy media_delete_own_folder on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create or replace function private.soft_delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'unauthorized';
  end if;

  update public.accounts
  set deleted_at = now()
  where id = uid
    and deleted_at is null;

  update public.profiles
  set status = 'removed'
  where account_id = uid
    and status is distinct from 'removed';

  return jsonb_build_object('deleted', true, 'accountId', uid);
end;
$$;

create or replace function public.soft_delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return private.soft_delete_own_account();
end;
$$;

revoke all on function public.soft_delete_own_account() from public, anon;
grant execute on function public.soft_delete_own_account() to authenticated;
revoke all on function private.soft_delete_own_account() from public, anon, authenticated;

create policy accounts_staff_moderation on public.accounts
  for update
  using (public.is_staff())
  with check (
    public.is_staff()
    and role = (select a.role from public.accounts a where a.id = accounts.id)
  );


