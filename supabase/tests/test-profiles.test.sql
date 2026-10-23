begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('ee000000-0000-4000-8000-0000000000ee', 'authenticated', 'authenticated', 't@testprof-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('ef000000-0000-4000-8000-0000000000ef', 'authenticated', 'authenticated', 's@testprof-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values ('ee000000-0000-4000-8000-0000000000ee'), ('ef000000-0000-4000-8000-0000000000ef')
on conflict (id) do nothing;
update public.accounts set is_test = true where id = 'ee000000-0000-4000-8000-0000000000ee';
update public.accounts set role = 'admin' where id = 'ef000000-0000-4000-8000-0000000000ef';
insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select 'ee100000-0000-4000-8000-0000000000ee', 'ee000000-0000-4000-8000-0000000000ee', 'testprof-t', 'Test Person', loc.id, 'live'
from public.locations loc where loc.slug = 'nairobi' and loc.kind = 'city';

set local role anon;
select is((select count(*)::int from public.live_profile_cards where id = 'ee100000-0000-4000-8000-0000000000ee'), 0, 'visitors never see test profiles');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ef000000-0000-4000-8000-0000000000ef","role":"authenticated"}', true);
select is((select count(*)::int from public.live_profile_cards where id = 'ee100000-0000-4000-8000-0000000000ee'), 1, 'staff still see them to test');
reset role;
select set_config('request.jwt.claims', '', true);

update private.settings set value = 'on' where key = 'show_test_profiles';
set local role anon;
select is((select count(*)::int from public.live_profile_cards where id = 'ee100000-0000-4000-8000-0000000000ee'), 1, 'the owner can switch them on for a demo');
reset role;

select * from finish();
rollback;
