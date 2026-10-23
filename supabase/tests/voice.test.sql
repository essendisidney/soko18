begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- A records, B listens, S is staff.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('e1000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'a@voice-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('e2000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'b@voice-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('e3000000-0000-4000-8000-0000000000e3', 'authenticated', 'authenticated', 's@voice-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('e1000000-0000-4000-8000-0000000000e1'), ('e2000000-0000-4000-8000-0000000000e2'), ('e3000000-0000-4000-8000-0000000000e3')
on conflict (id) do nothing;
update public.accounts set role = 'admin' where id = 'e3000000-0000-4000-8000-0000000000e3';

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('e1100000-0000-4000-8000-0000000000e1', 'e1000000-0000-4000-8000-0000000000e1', 'voice-a', 'Amani'),
  ('e2100000-0000-4000-8000-0000000000e2', 'e2000000-0000-4000-8000-0000000000e2', 'voice-b', 'Baraka')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select throws_ok(
  $$ select public.submit_voice('e2000000-0000-4000-8000-0000000000e2/0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b.webm', 9000) $$,
  'invalid', 'only a clip in your own folder'
);
select throws_ok(
  $$ select public.submit_voice('e1000000-0000-4000-8000-0000000000e1/0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a.webm', 30000) $$,
  'too_long', 'no longer than 15 seconds'
);
select is(
  public.submit_voice('e1000000-0000-4000-8000-0000000000e1/0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a.webm', 9000) ->> 'status',
  'pending', 'a new clip waits for review'
);
select isnt(public.profile_voice_path('e1100000-0000-4000-8000-0000000000e1'), null, 'you can hear your own clip while it waits');
select throws_ok($$ select public.review_voice('e1100000-0000-4000-8000-0000000000e1', true) $$, 'forbidden', 'members cannot approve clips');

select set_config('request.jwt.claims', '{"sub":"e2000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
select is(public.profile_voice_path('e1100000-0000-4000-8000-0000000000e1'), null, 'nobody else hears it before review');

select set_config('request.jwt.claims', '{"sub":"e3000000-0000-4000-8000-0000000000e3","role":"authenticated"}', true);
select lives_ok($$ select public.review_voice('e1100000-0000-4000-8000-0000000000e1', true) $$, 'staff approve it');

select set_config('request.jwt.claims', '{"sub":"e2000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
select isnt(public.profile_voice_path('e1100000-0000-4000-8000-0000000000e1'), null, 'once approved, members who can see the profile hear it');
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.blocks (blocker_id, blocked_id) values ('e1000000-0000-4000-8000-0000000000e1', 'e2000000-0000-4000-8000-0000000000e2');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e2000000-0000-4000-8000-0000000000e2","role":"authenticated"}', true);
select is(public.profile_voice_path('e1100000-0000-4000-8000-0000000000e1'), null, 'someone they blocked does not');

select set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
select is(
  public.submit_voice('e1000000-0000-4000-8000-0000000000e1/0c0c0c0c-0c0c-4c0c-8c0c-0c0c0c0c0c0c.m4a', 12000) ->> 'status',
  'pending', 'a replacement goes back to review'
);
select public.remove_voice();
select is((select count(*)::int from public.profile_voice where account_id = 'e1000000-0000-4000-8000-0000000000e1'), 0, 'members can remove their clip');
reset role;

select * from finish();
rollback;
