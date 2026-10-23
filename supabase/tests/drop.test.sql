begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- V (woman, 24, wants men). M1 fits. The others each fail one rule.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select v.id::uuid, 'authenticated', 'authenticated', v.email, now(), '{"provider":"email"}', '{}', now(), now()
from (values
  ('d1000000-0000-4000-8000-0000000000d1', 'v@drop-test.example'),
  ('d2000000-0000-4000-8000-0000000000d2', 'm1@drop-test.example'),
  ('d3000000-0000-4000-8000-0000000000d3', 'test@drop-test.example'),
  ('d4000000-0000-4000-8000-0000000000d4', 'idle@drop-test.example'),
  ('d5000000-0000-4000-8000-0000000000d5', 'w@drop-test.example'),
  ('d6000000-0000-4000-8000-0000000000d6', 'liked@drop-test.example'),
  ('d7000000-0000-4000-8000-0000000000d7', 'older@drop-test.example')
) as v(id, email);
insert into public.accounts (id)
select id from auth.users where email like '%@drop-test.example'
on conflict (id) do nothing;

update public.accounts set last_seen_at = now(), country_code = 'KE' where id in (select id from auth.users where email like '%@drop-test.example');
update public.accounts set date_of_birth = (current_date - interval '24 years 2 months')::date, show_me = array['man'] where id = 'd1000000-0000-4000-8000-0000000000d1';
update public.accounts set date_of_birth = (current_date - interval '26 years 2 months')::date
where id in ('d2000000-0000-4000-8000-0000000000d2', 'd3000000-0000-4000-8000-0000000000d3', 'd4000000-0000-4000-8000-0000000000d4',
             'd5000000-0000-4000-8000-0000000000d5', 'd6000000-0000-4000-8000-0000000000d6');
update public.accounts set date_of_birth = (current_date - interval '29 years 2 months')::date where id = 'd7000000-0000-4000-8000-0000000000d7';
update public.accounts set last_seen_at = now() - interval '40 days' where id = 'd4000000-0000-4000-8000-0000000000d4';

insert into public.profiles (id, account_id, slug, display_name, city_id, status, gender, looking_for)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live', v.gender, 'relationship'
from (values
  ('d1100000-0000-4000-8000-0000000000d1', 'd1000000-0000-4000-8000-0000000000d1', 'drop-v', 'Vera', 'woman'),
  ('d2100000-0000-4000-8000-0000000000d2', 'd2000000-0000-4000-8000-0000000000d2', 'drop-m1', 'Musa', 'man'),
  ('d3100000-0000-4000-8000-0000000000d3', 'd3000000-0000-4000-8000-0000000000d3', 'drop-test', 'Tester', 'man'),
  ('d4100000-0000-4000-8000-0000000000d4', 'd4000000-0000-4000-8000-0000000000d4', 'drop-idle', 'Idle', 'man'),
  ('d5100000-0000-4000-8000-0000000000d5', 'd5000000-0000-4000-8000-0000000000d5', 'drop-w', 'Wairimu', 'woman'),
  ('d6100000-0000-4000-8000-0000000000d6', 'd6000000-0000-4000-8000-0000000000d6', 'drop-liked', 'Liked', 'man'),
  ('d7100000-0000-4000-8000-0000000000d7', 'd7000000-0000-4000-8000-0000000000d7', 'drop-older', 'Older', 'man')
) as v(id, account_id, slug, name, gender)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';

-- The test account flag is set the way 00024 does it: as the database, not the member.
update public.accounts set is_test = true where id = 'd3000000-0000-4000-8000-0000000000d3';
insert into public.likes (actor_id, profile_id, kind) values ('d1000000-0000-4000-8000-0000000000d1', 'd6100000-0000-4000-8000-0000000000d6', 'like');

select ok(public.run_daily_drops(true) >= 1, 'the drop runs');
select is(
  (select array_agg(profile_id order by rank) from public.drop_picks where account_id = 'd1000000-0000-4000-8000-0000000000d1'),
  array['d2100000-0000-4000-8000-0000000000d2'::uuid],
  'only a real, active, fitting person she has not liked: never padded'
);
select ok(
  (select expires_at from public.drop_picks where account_id = 'd1000000-0000-4000-8000-0000000000d1' limit 1) > now() + interval '1 hour',
  'picks last until the next drop'
);
select is(
  (select title from public.notifications where account_id = 'd1000000-0000-4000-8000-0000000000d1' and href = '/drop'),
  'Your pick is in', 'she gets a push with the real number'
);
select public.run_daily_drops(true);
select is((select count(*)::int from public.drop_picks where account_id = 'd1000000-0000-4000-8000-0000000000d1'), 1, 'one drop per day');
select is((select count(*)::int from public.drop_picks where account_id = 'd3000000-0000-4000-8000-0000000000d3'), 0, 'test accounts get no drop');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
select is(public.my_drop() -> 'picks' -> 0 ->> 'slug', 'drop-m1', 'she sees her pick');
select public.set_show_me('any');
reset role;
select set_config('request.jwt.claims', '', true);
select is(
  (select show_me from public.accounts where id = 'd1000000-0000-4000-8000-0000000000d1'),
  array['man', 'woman', 'nonbinary'], 'Show me saves to the account'
);

select * from finish();
rollback;
