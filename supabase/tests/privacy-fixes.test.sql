begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f1000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'x@pf-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('f2000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'y@pf-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('f3000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'kid@pf-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('f1000000-0000-4000-8000-0000000000f1'), ('f2000000-0000-4000-8000-0000000000f2'), ('f3000000-0000-4000-8000-0000000000f3')
on conflict (id) do nothing;

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('f1100000-0000-4000-8000-0000000000f1', 'f1000000-0000-4000-8000-0000000000f1', 'pf-x', 'X'),
  ('f2100000-0000-4000-8000-0000000000f2', 'f2000000-0000-4000-8000-0000000000f2', 'pf-y', 'Y')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';

-- Y blocks X.
insert into public.blocks (blocker_id, blocked_id) values ('f2000000-0000-4000-8000-0000000000f2', 'f1000000-0000-4000-8000-0000000000f1');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-0000000000f1', true);
select set_config('request.jwt.claims', '{"sub":"f1000000-0000-4000-8000-0000000000f1","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles where slug = 'pf-y'), 0, 'a blocked person cannot see the blocker');
select is((select count(*)::int from public.live_profile_cards where slug = 'pf-y'), 0, 'nor on the Discover cards');
select throws_ok(
  $$ insert into public.likes (actor_id, profile_id, kind) values ('f1000000-0000-4000-8000-0000000000f1', 'f2100000-0000-4000-8000-0000000000f2', 'like') $$,
  '42501', null, 'and cannot like them'
);
select throws_ok(
  $$ insert into public.profile_media (profile_id, storage_path, status) values ('f1100000-0000-4000-8000-0000000000f1', 'f2000000-0000-4000-8000-0000000000f2/stolen.jpg', 'uploaded') $$,
  'forbidden', 'cannot attach a photo from someone else''s folder'
);
select lives_ok(
  $$ insert into public.profile_media (profile_id, storage_path, status) values ('f1100000-0000-4000-8000-0000000000f1', 'f1000000-0000-4000-8000-0000000000f1/mine.jpg', 'uploaded') $$,
  'can attach a photo from your own folder'
);
-- Skipping the age gate by writing the columns directly does nothing.
update public.accounts set date_of_birth = '1990-01-01', age_confirmed_at = now() where id = 'f1000000-0000-4000-8000-0000000000f1';
select is((select age_confirmed_at from public.accounts where id = 'f1000000-0000-4000-8000-0000000000f1'), null, 'members cannot confirm their own age directly');

-- An under-18 date of birth bans the account, and the ban sticks.
select set_config('request.jwt.claim.sub', 'f3000000-0000-4000-8000-0000000000f3', true);
select set_config('request.jwt.claims', '{"sub":"f3000000-0000-4000-8000-0000000000f3","role":"authenticated"}', true);
select is(public.record_consents('test', (current_date - interval '15 years')::date, true, false) ->> 'error', 'underage', 'under 18 is refused');
reset role;
select ok((select is_banned from public.accounts where id = 'f3000000-0000-4000-8000-0000000000f3'), 'and the ban is saved');

select * from finish();
rollback;
