begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a1100000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'a@limit-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('a2200000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'b@limit-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values ('a1100000-0000-4000-8000-0000000000a1'), ('a2200000-0000-4000-8000-0000000000a2')
on conflict (id) do nothing;
insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select 'a2210000-0000-4000-8000-0000000000a2', 'a2200000-0000-4000-8000-0000000000a2', 'limit-b', 'B', loc.id, 'live'
from public.locations loc where loc.slug = 'nairobi' and loc.kind = 'city';
insert into public.matches (id, account_a, account_b, profile_id)
values ('a3300000-0000-4000-8000-0000000000a3', 'a1100000-0000-4000-8000-0000000000a1', 'a2200000-0000-4000-8000-0000000000a2', 'a2210000-0000-4000-8000-0000000000a2');
insert into public.conversations (id, match_id) values ('a4400000-0000-4000-8000-0000000000a4', 'a3300000-0000-4000-8000-0000000000a3');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"a1100000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

-- 30 messages in a minute is fine; the 31st is refused.
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select 'a4400000-0000-4000-8000-0000000000a4', 'a1100000-0000-4000-8000-0000000000a1', 'hi ' || g from generate_series(1, 30) g $$,
  '30 messages a minute is allowed'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body) values ('a4400000-0000-4000-8000-0000000000a4', 'a1100000-0000-4000-8000-0000000000a1', 'one more') $$,
  'rate_limited', 'the 31st message in a minute is refused'
);

-- Panic alerts: 10 a day.
select lives_ok($$ select public.record_safety_send('panic') from generate_series(1, 10) $$, '10 panic alerts a day are allowed');
select throws_ok($$ select public.record_safety_send('panic') $$, 'rate_limited', 'the 11th is refused');

-- A banned account can't like, straight away.
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
update public.accounts set is_banned = true where id = 'a1100000-0000-4000-8000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1100000-0000-4000-8000-0000000000a1', true);
select set_config('request.jwt.claims', '{"sub":"a1100000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.likes (actor_id, profile_id, kind) values ('a1100000-0000-4000-8000-0000000000a1', 'a2210000-0000-4000-8000-0000000000a2', 'like') $$,
  'banned', 'a banned account cannot like'
);

select * from finish();
rollback;
