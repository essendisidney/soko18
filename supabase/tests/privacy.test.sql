begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

-- Q is incognito (Platinum/Incognito hides you unless you liked them). P is an ordinary member.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('e0000000-0000-4000-8000-00000000000e', 'authenticated', 'authenticated', 'p@privacy-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('f0000000-0000-4000-8000-00000000000f', 'authenticated', 'authenticated', 'q@privacy-test.example', now(), '{"provider":"email"}', '{}', now(), now());

insert into public.accounts (id) values
  ('e0000000-0000-4000-8000-00000000000e'), ('f0000000-0000-4000-8000-00000000000f')
on conflict (id) do nothing;

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('e1000000-0000-4000-8000-00000000000e', 'e0000000-0000-4000-8000-00000000000e', 'privacy-p-nairobi', 'P'),
  ('f1000000-0000-4000-8000-00000000000f', 'f0000000-0000-4000-8000-00000000000f', 'privacy-q-nairobi', 'Q')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';

insert into public.subscriptions (account_id, plan, status, starts_at, ends_at)
values ('f0000000-0000-4000-8000-00000000000f', 'incognito', 'active', now() - interval '1 day', now() + interval '29 days');

-- Signed out: the incognito profile can't be read from the table, only the ordinary one.
set local role anon;
select is((select count(*)::int from public.profiles where slug = 'privacy-q-nairobi'), 0, 'signed out: incognito profile is not readable');
select is((select count(*)::int from public.profiles where slug = 'privacy-p-nairobi'), 1, 'signed out: ordinary live profiles still are');
reset role;

-- P can't read Q straight from the table either.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-00000000000e', true);
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-00000000000e","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles where slug = 'privacy-q-nairobi'), 0, 'members cannot read an incognito profile');
reset role;

-- Q still sees their own profile.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-00000000000f', true);
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-00000000000f","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles where slug = 'privacy-q-nairobi'), 1, 'you always see your own profile');
reset role;

-- Once Q likes P, P can see Q (that's how incognito works), on the table and on the cards.
insert into public.likes (actor_id, profile_id, kind)
values ('f0000000-0000-4000-8000-00000000000f', 'e1000000-0000-4000-8000-00000000000e', 'like');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-00000000000e', true);
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-00000000000e","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles where slug = 'privacy-q-nairobi'), 1, 'people an incognito member liked can see them');
select is((select count(*)::int from public.live_profile_cards where slug = 'privacy-q-nairobi'), 1, 'and on the Discover cards');
reset role;

select * from finish();
rollback;
