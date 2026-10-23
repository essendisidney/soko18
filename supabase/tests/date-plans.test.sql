begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f1000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'p@plan-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('f2000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'q@plan-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values ('f1000000-0000-4000-8000-0000000000f1'), ('f2000000-0000-4000-8000-0000000000f2')
on conflict (id) do nothing;
insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select 'f1100000-0000-4000-8000-0000000000f1', 'f1000000-0000-4000-8000-0000000000f1', 'plan-p', 'Pendo Atieno', loc.id, 'draft'
from public.locations loc where loc.slug = 'nairobi' and loc.kind = 'city';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select throws_ok(
  $$ select public.start_date_plan('Java House, Westlands', now() + interval '1 hour', now() + interval '3 hours', 'Mum', '0712345678') $$,
  'invalid_contact', 'the contact needs a real number'
);
select throws_ok(
  $$ select public.start_date_plan('Java House, Westlands', now() + interval '1 hour', now() + interval '30 minutes', 'Mum', '+254712345678') $$,
  'invalid_checkin', 'check-in comes after the date starts'
);
select lives_ok(
  $$ select public.start_date_plan('Java House, Westlands', now() + interval '1 hour', now() + interval '3 hours', 'Mum', '+254712345678') $$,
  'a date plan starts'
);
select throws_ok(
  $$ select public.start_date_plan('Another place', now() + interval '1 hour', now() + interval '3 hours', 'Mum', '+254712345678') $$,
  'plan_active', 'one plan at a time'
);
select is((public.date_plan_extend((select id from public.date_plans limit 1)) ->> 'checkInAt') is not null, true, 'need more time adds 30 minutes');
select throws_ok('select count(*) from public.safety_outbox', '42501', null, 'members cannot read the safety outbox');

select set_config('request.jwt.claims', '{"sub":"f2000000-0000-4000-8000-0000000000f2","role":"authenticated"}', true);
select is((select count(*)::int from public.date_plans), 0, 'nobody else sees your plan');
reset role;
select set_config('request.jwt.claims', '', true);

-- Check-in time passes: a reminder push first.
update public.date_plans set check_in_at = now() - interval '1 minute' where account_id = 'f1000000-0000-4000-8000-0000000000f1';
select public.run_date_checkins();
select is(
  (select count(*)::int from public.notifications where account_id = 'f1000000-0000-4000-8000-0000000000f1' and title = 'Time to check in'),
  1, 'reminded at the check-in time'
);
select is((select status from public.date_plans where account_id = 'f1000000-0000-4000-8000-0000000000f1'), 'active', 'no alert during the grace period');

-- Grace period over: the contact is alerted with the plan.
update public.date_plans set check_in_at = now() - interval '20 minutes' where account_id = 'f1000000-0000-4000-8000-0000000000f1';
select is(public.run_date_checkins(), 1, 'a missed check-in raises one alert');
select is(
  (select member_name || '|' || contact_phone || '|' || place from public.safety_outbox_due(5) where kind = 'missed_checkin'),
  'Pendo|+254712345678|Java House, Westlands', 'the alert carries first name, contact and place only'
);

-- Checking in afterwards closes it and tells the contact.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);
select is((public.date_plan_safe((select id from public.date_plans limit 1)) ->> 'allClearSent')::boolean, true, '"I''m safe" after a missed check-in');
reset role;
select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from public.safety_outbox where kind = 'all_clear'), 1, 'the contact gets an all-clear');

select * from finish();
rollback;
