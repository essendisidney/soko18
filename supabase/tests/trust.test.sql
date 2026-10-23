begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- Y is 20, O is 35, V is 27 and selfie-verified.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('b1000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'y@trust-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('b2000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'o@trust-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('b3000000-0000-4000-8000-0000000000b3', 'authenticated', 'authenticated', 'v@trust-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('b1000000-0000-4000-8000-0000000000b1'), ('b2000000-0000-4000-8000-0000000000b2'), ('b3000000-0000-4000-8000-0000000000b3')
on conflict (id) do nothing;
update public.accounts set date_of_birth = (current_date - interval '20 years 2 months')::date where id = 'b1000000-0000-4000-8000-0000000000b1';
update public.accounts set date_of_birth = (current_date - interval '35 years 2 months')::date where id = 'b2000000-0000-4000-8000-0000000000b2';
update public.accounts set date_of_birth = (current_date - interval '27 years 2 months')::date where id = 'b3000000-0000-4000-8000-0000000000b3';

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('b1100000-0000-4000-8000-0000000000b1', 'b1000000-0000-4000-8000-0000000000b1', 'trust-y', 'Yasmin Achieng'),
  ('b2100000-0000-4000-8000-0000000000b2', 'b2000000-0000-4000-8000-0000000000b2', 'trust-o', 'Omari'),
  ('b3100000-0000-4000-8000-0000000000b3', 'b3000000-0000-4000-8000-0000000000b3', 'trust-v', 'Wanjiru Kamau')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';
update public.profiles set is_verified = true where id = 'b3100000-0000-4000-8000-0000000000b3';

-- Age bands, as Y (20).
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-0000000000b1', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
select is((public.my_age_window() ->> 'max')::int, 24, 'an 18–25 member sees ±4 years by default');
select is((select count(*)::int from public.profiles where slug = 'trust-o'), 0, 'a 35-year-old is hidden from a 20-year-old by default');
select is((select count(*)::int from public.profiles where slug = 'trust-v'), 1, 'a 27-year-old is still visible');
select lives_ok($$ select public.set_age_window(18, 40) $$, 'the younger member can widen their range');
select is((select count(*)::int from public.profiles where slug = 'trust-o'), 1, 'and then sees the 35-year-old');
reset role;

select ok(private.age_band_blocks_message('b2000000-0000-4000-8000-0000000000b2', 'b1000000-0000-4000-8000-0000000000b1'),
  'no paid message before a match from 35 to 20');

-- Vouches.
set local role authenticated;
select throws_ok($$ select public.vouch_for('b3100000-0000-4000-8000-0000000000b3') $$, 'not_verified', 'unverified members cannot vouch');
select set_config('request.jwt.claim.sub', 'b3000000-0000-4000-8000-0000000000b3', true);
select set_config('request.jwt.claims', '{"sub":"b3000000-0000-4000-8000-0000000000b3","role":"authenticated"}', true);
select lives_ok($$ select public.vouch_for('b1100000-0000-4000-8000-0000000000b1') $$, 'a verified member can vouch');
select is(public.profile_vouches('b1100000-0000-4000-8000-0000000000b1') -> 'names', '["Wanjiru"]'::jsonb, 'the profile shows the first name only');
reset role;

select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
update public.accounts set is_banned = true where id = 'b3000000-0000-4000-8000-0000000000b3';
select is((select count(*)::int from public.vouches where voucher_id = 'b3000000-0000-4000-8000-0000000000b3'), 0, 'a banned voucher''s vouches go');
select is((public.profile_vouches('b1100000-0000-4000-8000-0000000000b1') ->> 'count')::int, 0, 'and the profile no longer shows them');

select * from finish();
rollback;
