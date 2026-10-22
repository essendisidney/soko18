begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('d8000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'a@nudge-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('d8000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'b@nudge-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values ('d8000000-0000-4000-8000-0000000000d1'), ('d8000000-0000-4000-8000-0000000000d2')
on conflict (id) do nothing;

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select 'd8100000-0000-4000-8000-0000000000d2', 'd8000000-0000-4000-8000-0000000000d2', 'nudge-b', 'B', loc.id, 'live'
from public.locations loc where loc.slug = 'nairobi' and loc.kind = 'city';

-- A quiet match from two days ago.
insert into public.matches (id, account_a, account_b, profile_id, created_at)
values ('d8200000-0000-4000-8000-0000000000d1', 'd8000000-0000-4000-8000-0000000000d1', 'd8000000-0000-4000-8000-0000000000d2',
        'd8100000-0000-4000-8000-0000000000d2', now() - interval '2 days');
insert into public.conversations (match_id) values ('d8200000-0000-4000-8000-0000000000d1');

select ok(public.run_match_nudges() >= 1, 'a quiet match gets nudged');
select is((select count(*)::int from public.notifications
  where title = 'Your match is waiting' and account_id in ('d8000000-0000-4000-8000-0000000000d1', 'd8000000-0000-4000-8000-0000000000d2')), 2,
  'both people hear about it');
select public.run_match_nudges();
select is((select count(*)::int from public.notifications
  where title = 'Your match is waiting' and account_id in ('d8000000-0000-4000-8000-0000000000d1', 'd8000000-0000-4000-8000-0000000000d2')), 2,
  'never twice for the same match');

set local role authenticated;
select throws_ok('select public.run_match_nudges()', '42501', null, 'members cannot run it');
reset role;
set local role anon;
select is((select count(*)::int from public.match_nudges), 0, 'nobody else can read nudges');
reset role;

select * from finish();
rollback;
