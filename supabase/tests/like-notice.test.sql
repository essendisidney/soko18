begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('b6000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'a@like-notice.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('b6000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'b@like-notice.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('b6000000-0000-4000-8000-0000000000b3', 'authenticated', 'authenticated', 'c@like-notice.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('b6000000-0000-4000-8000-0000000000b1'), ('b6000000-0000-4000-8000-0000000000b2'), ('b6000000-0000-4000-8000-0000000000b3')
on conflict (id) do nothing;

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('b6100000-0000-4000-8000-0000000000b1', 'b6000000-0000-4000-8000-0000000000b1', 'like-notice-a', 'A'),
  ('b6100000-0000-4000-8000-0000000000b2', 'b6000000-0000-4000-8000-0000000000b2', 'like-notice-b', 'B'),
  ('b6100000-0000-4000-8000-0000000000b3', 'b6000000-0000-4000-8000-0000000000b3', 'like-notice-c', 'C')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';

-- B likes A: A hears about it.
insert into public.likes (actor_id, profile_id, kind) values ('b6000000-0000-4000-8000-0000000000b2', 'b6100000-0000-4000-8000-0000000000b1', 'like');
select is((select count(*)::int from public.notifications where account_id = 'b6000000-0000-4000-8000-0000000000b1' and title = 'Someone likes you'), 1, 'a like tells the owner');

-- C likes A the same day: still one notice.
insert into public.likes (actor_id, profile_id, kind) values ('b6000000-0000-4000-8000-0000000000b3', 'b6100000-0000-4000-8000-0000000000b1', 'like');
select is((select count(*)::int from public.notifications where account_id = 'b6000000-0000-4000-8000-0000000000b1' and title = 'Someone likes you'), 1, 'at most one a day');

-- A likes B back: a match, so B gets "It's a match", not "Someone likes you".
insert into public.likes (actor_id, profile_id, kind) values ('b6000000-0000-4000-8000-0000000000b1', 'b6100000-0000-4000-8000-0000000000b2', 'like');
select is((select count(*)::int from public.notifications where account_id = 'b6000000-0000-4000-8000-0000000000b2' and title = 'Someone likes you'), 0, 'a match is not also a like notice');

-- Passing never notifies.
insert into public.likes (actor_id, profile_id, kind) values ('b6000000-0000-4000-8000-0000000000b1', 'b6100000-0000-4000-8000-0000000000b3', 'pass');
select is((select count(*)::int from public.notifications where account_id = 'b6000000-0000-4000-8000-0000000000b3'), 0, 'a pass says nothing');

select * from finish();
rollback;
