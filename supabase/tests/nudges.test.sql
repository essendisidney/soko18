begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('a5000000-0000-4000-8000-0000000000a5', 'authenticated', 'authenticated', 'n@nudges-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values ('a5000000-0000-4000-8000-0000000000a5') on conflict (id) do nothing;

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select 'a5100000-0000-4000-8000-0000000000a5', 'a5000000-0000-4000-8000-0000000000a5', 'nudges-n-nairobi', 'N', loc.id, 'draft'
from public.locations loc where loc.slug = 'nairobi' and loc.kind = 'city';

-- Going live the first time: one free Super Like and one free Boost.
update public.profiles set status = 'live' where id = 'a5100000-0000-4000-8000-0000000000a5';
select is((select super_likes from public.member_perks where account_id = 'a5000000-0000-4000-8000-0000000000a5'), 1, 'welcome: one Super Like');
select is((select boosts from public.member_perks where account_id = 'a5000000-0000-4000-8000-0000000000a5'), 1, 'welcome: one Boost');

-- Going live again never pays out twice.
update public.profiles set status = 'draft' where id = 'a5100000-0000-4000-8000-0000000000a5';
update public.profiles set status = 'live' where id = 'a5100000-0000-4000-8000-0000000000a5';
select is((select count(*)::int from public.member_gifts where account_id = 'a5000000-0000-4000-8000-0000000000a5' and kind = 'welcome'), 1, 'welcome gift only once');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a5000000-0000-4000-8000-0000000000a5', true);
select set_config('request.jwt.claims', '{"sub":"a5000000-0000-4000-8000-0000000000a5","role":"authenticated"}', true);

select is((public.check_in_today() ->> 'days')::int, 1, 'first open starts a streak');
select is((public.check_in_today() ->> 'days')::int, 1, 'opening twice the same day does not count twice');

-- Pretend yesterday was day 4: today is day 5 and earns a Super Like.
reset role;
update public.member_streaks
set current_days = 4, last_day = (now() at time zone 'Africa/Nairobi')::date - 1
where account_id = 'a5000000-0000-4000-8000-0000000000a5';
set local role authenticated;
select is((public.check_in_today() ->> 'gift')::boolean, true, 'day 5 earns a gift');
reset role;
select is((select super_likes from public.member_perks where account_id = 'a5000000-0000-4000-8000-0000000000a5'), 2, 'streak gift adds a Super Like');

-- A missed day starts over.
update public.member_streaks
set current_days = 7, last_day = (now() at time zone 'Africa/Nairobi')::date - 3
where account_id = 'a5000000-0000-4000-8000-0000000000a5';
set local role authenticated;
select is((public.check_in_today() ->> 'days')::int, 1, 'a missed day resets the streak');

-- One person active is never shown as a number.
set local role anon;
select is(public.active_now('nairobi'), null, 'active now stays hidden below 10');
reset role;

select * from finish();
rollback;
