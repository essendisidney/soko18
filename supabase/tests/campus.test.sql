begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- Accounts come from the auth.users trigger. A = signed in with a student email, B = verifies by code,
-- C = under 18 with a student email, D = tries to reuse B's student email.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'amina@students.uonbi.ac.ke', now(), '{"provider":"email"}', '{}', now(), now()),
  ('b0000000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'brian@campus-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('c0000000-0000-4000-8000-00000000000c', 'authenticated', 'authenticated', 'kid@students.uonbi.ac.ke', now(), '{"provider":"email"}', '{}', now(), now()),
  ('d0000000-0000-4000-8000-00000000000d', 'authenticated', 'authenticated', 'dan@campus-test.example', now(), '{"provider":"email"}', '{}', now(), now());

insert into public.accounts (id) values
  ('a0000000-0000-4000-8000-00000000000a'), ('b0000000-0000-4000-8000-00000000000b'),
  ('c0000000-0000-4000-8000-00000000000c'), ('d0000000-0000-4000-8000-00000000000d')
on conflict (id) do nothing;

update public.accounts set date_of_birth = date '2004-01-01'
where id in ('a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-00000000000d');
update public.accounts set date_of_birth = (current_date - interval '17 years')::date
where id = 'c0000000-0000-4000-8000-00000000000c';
update public.campuses set unlock_target = 2, status = 'waitlist', opened_at = null where slug = 'uon';

-- A: verified straight from the sign-in email
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select is(public.claim_campus_from_login()->>'campus', 'uon', 'a student sign-in email verifies the campus');
select is(public.claim_campus_from_login()->>'reason', 'already', 'verifying twice is refused');

-- C: under 18 never gets in, even with a student email
select set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-00000000000c', true);
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
select is(public.claim_campus_from_login()->>'reason', 'adult_only', 'campus never skips 18+');

-- B: a non-student sign-in email is not a campus
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is(public.claim_campus_from_login()->>'reason', 'not_campus', 'other email domains are not a campus');
select throws_ok(
  $$ select public.start_campus_code('b0000000-0000-4000-8000-00000000000b', 'brian@students.uonbi.ac.ke', '123456') $$,
  '42501', null, 'members cannot issue their own codes'
);
reset role;

-- The server issues B a code (service role only)
set local role service_role;
select is(public.start_campus_code('b0000000-0000-4000-8000-00000000000b', 'Brian@Students.UoNbi.ac.ke', '123456')->>'ok', 'true', 'a student email gets a code');
select is(public.start_campus_code('b0000000-0000-4000-8000-00000000000b', 'brian@students.uonbi.ac.ke', '654321')->>'reason', 'wait', 'codes are rate limited');
select is(public.start_campus_code('d0000000-0000-4000-8000-00000000000d', 'dan@uonbi.ac.ke.evil.example', '111111')->>'reason', 'not_campus', 'lookalike domains are refused');
select is(public.start_campus_code('d0000000-0000-4000-8000-00000000000d', 'dan@notuonbi.ac.ke', '111111')->>'reason', 'not_campus', 'domains match whole labels only');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is(public.confirm_campus_code('000000')->>'reason', 'wrong', 'a wrong code is refused');
select is(public.confirm_campus_code('123456')->>'campus', 'uon', 'the right code verifies');
select is_empty(
  $$ select 1 from public.campus_members where account_id <> 'b0000000-0000-4000-8000-00000000000b' $$,
  'members only see their own campus row'
);
reset role;

select is((select status from public.campuses where slug = 'uon'), 'live', 'the campus opens at its target');

set local role service_role;
select is(public.start_campus_code('d0000000-0000-4000-8000-00000000000d', 'brian@students.uonbi.ac.ke', '222222')->>'reason', 'taken', 'one student email verifies one account');
reset role;

set local role anon;
select is((select (b->>'joined')::int from jsonb_array_elements(public.campus_board()) b where b->>'slug' = 'uon'), 2, 'the board shows real counts');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-00000000000d', true);
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-4000-8000-00000000000d","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.campus_members (account_id, campus_id, email_hash, method)
     select 'd0000000-0000-4000-8000-00000000000d', id, 'x', 'email_code' from public.campuses where slug = 'ku' $$,
  '42501', null, 'members cannot add themselves to a campus'
);
reset role;

-- Hide me from my campus: B hides; A (same campus) can't see B, D (no campus) still can.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-00000000000b', true);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
update public.campus_members set hide_from_campus = true where account_id = 'b0000000-0000-4000-8000-00000000000b';
select is(public.my_campus()->>'hideFromCampus', 'true', 'members can hide from their campus');
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select ok(public.profile_hidden_from_me('b0000000-0000-4000-8000-00000000000b'), 'hidden from verified students at the same campus');
select set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-00000000000d', true);
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-4000-8000-00000000000d","role":"authenticated"}', true);
select ok(not public.profile_hidden_from_me('b0000000-0000-4000-8000-00000000000b'), 'still visible outside the campus');

-- Comrade Gold: D (no campus) can't start a checkout; A (verified) can.
select throws_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('d0000000-0000-4000-8000-00000000000d', 'sandbox', 'test:comrade-d', 199, 199, 'KES', 'KE', 'pending', 'gold', 'comrade_month') $$,
  '42501', null, 'Comrade Gold is for verified students only'
);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('a0000000-0000-4000-8000-00000000000a', 'sandbox', 'test:comrade-a', 199, 199, 'KES', 'KE', 'pending', 'gold', 'comrade_month') $$,
  'verified students can buy Comrade Gold'
);
reset role;

select * from finish();
rollback;
