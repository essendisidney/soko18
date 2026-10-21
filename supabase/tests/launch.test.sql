begin;
create extension if not exists pgtap with schema extensions;

select plan(2);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('c7000000-0000-4000-8000-0000000000c7', 'authenticated', 'authenticated', 'm@launch-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values ('c7000000-0000-4000-8000-0000000000c7') on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c7000000-0000-4000-8000-0000000000c7', true);
select set_config('request.jwt.claims', '{"sub":"c7000000-0000-4000-8000-0000000000c7","role":"authenticated"}', true);
select throws_ok('select public.staff_daily(14)', 'forbidden', 'members cannot read the launch dashboard');
reset role;

update public.accounts set role = 'admin' where id = 'c7000000-0000-4000-8000-0000000000c7';
set local role authenticated;
select is(jsonb_array_length(public.staff_daily(14)), 14, 'staff get one row per day');
reset role;

select * from finish();
rollback;
