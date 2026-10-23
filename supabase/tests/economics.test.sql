begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- A is the admin, M a member who paid KES 149 for real and 99 in the sandbox, T a test account.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('d8000000-0000-4000-8000-0000000000d8', 'authenticated', 'authenticated', 'a@econ-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('d9000000-0000-4000-8000-0000000000d9', 'authenticated', 'authenticated', 'm@econ-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('da000000-0000-4000-8000-0000000000da', 'authenticated', 'authenticated', 't@econ-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('d8000000-0000-4000-8000-0000000000d8'), ('d9000000-0000-4000-8000-0000000000d9'), ('da000000-0000-4000-8000-0000000000da')
on conflict (id) do nothing;
update public.accounts set role = 'admin' where id = 'd8000000-0000-4000-8000-0000000000d8';
update public.accounts set is_test = true where id = 'da000000-0000-4000-8000-0000000000da';
update public.accounts set last_seen_at = now() where id in ('d9000000-0000-4000-8000-0000000000d9', 'd8000000-0000-4000-8000-0000000000d8');

insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku, settled_at)
values
  ('d9000000-0000-4000-8000-0000000000d9', 'intasend', 'intasend:e1', 149, 149, 'KES', 'KE', 'completed', 'gold', 'gold_week', now()),
  ('d9000000-0000-4000-8000-0000000000d9', 'sandbox', 'sandbox:e2', 99, 99, 'KES', 'KE', 'completed', 'boost', 'boost_1', now()),
  ('da000000-0000-4000-8000-0000000000da', 'intasend', 'intasend:e3', 499, 499, 'KES', 'KE', 'completed', 'gold', 'gold_month', now()),
  ('d9000000-0000-4000-8000-0000000000d9', 'paystack', 'paystack:e4', 5, 4.99, 'GBP', 'GB', 'completed', 'gold', 'gold_week', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d9000000-0000-4000-8000-0000000000d9","role":"authenticated"}', true);
select throws_ok('select public.staff_economics()', 'forbidden', 'members cannot see the economics');
select throws_ok($$ select public.set_admin_cost(date_trunc('month', now())::date, 'hosting', 1000) $$, 'forbidden', 'members cannot enter costs');

select set_config('request.jwt.claims', '{"sub":"d8000000-0000-4000-8000-0000000000d8","role":"authenticated"}', true);
create temp table _e on commit drop as select public.staff_economics() as e;
select is(
  (select (r ->> 'gross')::numeric from _e, jsonb_array_elements(e -> 'revenue') r where r ->> 'currency' = 'KES'),
  149::numeric, 'only real, non-sandbox, non-test payments count'
);
select is(
  (select count(*)::int from _e, jsonb_array_elements(e -> 'revenue') r),
  2, 'each currency stays separate'
);
select is((select (e ->> 'netKes')::numeric from _e), 149::numeric, 'Kenyan net is shillings only, never mixed with pounds');
select is((select (e ->> 'payingMembers')::int from _e), 1, 'one real paying member');

select lives_ok($$ select public.set_admin_cost(date_trunc('month', now())::date, 'hosting', 2500, 'Supabase Pro') $$, 'the admin enters a cost');
select is((public.staff_economics() ->> 'costsKes')::numeric, 2500::numeric, 'costs add up for the month');
reset role;

select * from finish();
rollback;
