begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

-- ---------------------------------------------------------------------------
-- Auth users (postgres bypasses RLS). Accounts.fk → auth.users.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'owner@soko18.test',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'seeker@soko18.test',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated',
    'authenticated',
    'staff@soko18.test',
    crypt('password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into public.accounts (id, role, display_name, age_confirmed_at)
values
  ('11111111-1111-4111-8111-111111111111', 'owner', 'Owner', now()),
  ('22222222-2222-4222-8222-222222222222', 'seeker', 'Seeker', now()),
  ('33333333-3333-4333-8333-333333333333', 'moderator', 'Staff', now());

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'rls-owner-nairobi',
  'Owner',
  loc.id,
  'live'
from public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';

insert into public.profile_media (id, profile_id, storage_path, status)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'pending/not-public.jpg',
  'uploaded'
);

insert into public.moderation_cases (id, target_type, target_id, status)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'media',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'open'
);

select has_table('public', 'profile_media', 'profile_media exists');
select has_table('public', 'likes', 'likes exists');
select has_table('public', 'moderation_cases', 'moderation_cases exists');

select ok(
  (select c.relrowsecurity
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'profile_media'),
  'RLS is enabled on profile_media'
);

-- Anon cannot read pending media
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.role', 'anon', true);

select is_empty(
  $$ select id from public.profile_media where status = 'uploaded' $$,
  'anon cannot read pending media'
);

-- Owner can read own pending row
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select results_eq(
  $$ select count(*)::int from public.profile_media where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$,
  ARRAY[1],
  'owner can read own pending media'
);

-- Seeker cannot like as the owner
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);

select throws_ok(
  $$ insert into public.likes (actor_id, profile_id, kind)
     values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'like'
     ) $$,
  '42501'
);

select lives_ok(
  $$ insert into public.likes (actor_id, profile_id, kind)
     values (
       '22222222-2222-4222-8222-222222222222',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'like'
     ) $$,
  'user can insert a like as themselves'
);

select is_empty(
  $$ select id from public.moderation_cases $$,
  'seeker cannot read staff-only moderation'
);

select throws_ok(
  $$ insert into public.moderation_cases (target_type, target_id)
     values ('media', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') $$,
  '42501'
);

-- Staff can read the queue
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);

select results_eq(
  $$ select count(*)::int from public.moderation_cases $$,
  ARRAY[1],
  'staff can read moderation cases'
);

select * from finish();
rollback;
