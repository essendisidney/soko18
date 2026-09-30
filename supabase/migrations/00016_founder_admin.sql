-- Emails listed in private.settings.admin_emails (comma-separated) become admins on sign-up.
insert into private.settings (key, value) values ('admin_emails', 'essendisidney@gmail.com')
on conflict (key) do update set value = excluded.value;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  v_admin boolean := lower(coalesce(new.email, '')) = any (
    string_to_array(lower(coalesce((select value from private.settings where key = 'admin_emails'), '')), ',')
  );
begin
  insert into public.accounts (id, display_name, role)
  values (new.id, nullif(new.raw_user_meta_data->>'display_name', ''),
          case when v_admin then 'admin'::public.account_role else 'seeker'::public.account_role end);
  update auth.users
  set raw_app_meta_data = coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', case when v_admin then 'admin' else 'seeker' end)
  where id = new.id;
  return new;
end;
$$;

update public.accounts set role = 'admin'
where id in (select id from auth.users where lower(email) = 'essendisidney@gmail.com');

revoke execute on all functions in schema private from public, anon, authenticated;
