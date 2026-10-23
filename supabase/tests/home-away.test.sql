begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- L lives in London (from Nairobi), T lives in the US and flies home, K lives in Nairobi.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('b4000000-0000-4000-8000-0000000000b4', 'authenticated', 'authenticated', 'l@away-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('b5000000-0000-4000-8000-0000000000b5', 'authenticated', 'authenticated', 't@away-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('b6000000-0000-4000-8000-0000000000b6', 'authenticated', 'authenticated', 'k@away-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('b4000000-0000-4000-8000-0000000000b4'), ('b5000000-0000-4000-8000-0000000000b5'), ('b6000000-0000-4000-8000-0000000000b6')
on conflict (id) do nothing;
update public.accounts set country_code = 'GB', home_city_id = (select id from public.locations where slug = 'nairobi' and kind = 'city')
where id = 'b4000000-0000-4000-8000-0000000000b4';
update public.accounts set country_code = 'US' where id = 'b5000000-0000-4000-8000-0000000000b5';
update public.accounts set country_code = 'KE' where id = 'b6000000-0000-4000-8000-0000000000b6';

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('b4100000-0000-4000-8000-0000000000b4', 'b4000000-0000-4000-8000-0000000000b4', 'away-l', 'Lulu'),
  ('b5100000-0000-4000-8000-0000000000b5', 'b5000000-0000-4000-8000-0000000000b5', 'away-t', 'Tom'),
  ('b6100000-0000-4000-8000-0000000000b6', 'b6000000-0000-4000-8000-0000000000b6', 'away-k', 'Kim')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';

select is(
  (select count(*)::int from public.live_profile_cards where id in ('b4100000-0000-4000-8000-0000000000b4', 'b5100000-0000-4000-8000-0000000000b5')),
  0, 'members abroad stay out of Kenyan decks by default'
);
select is((select count(*)::int from public.live_profile_cards where id = 'b6100000-0000-4000-8000-0000000000b6'), 1, 'members at home show as usual');

-- Home & Away (settled the normal way would add this subscription).
insert into public.subscriptions (account_id, plan, status, starts_at, ends_at)
values ('b4000000-0000-4000-8000-0000000000b4', 'home_away', 'active', now() - interval '1 day', now() + interval '29 days');
select is(
  (select away_country || '|' || home_city_name from public.live_profile_cards where id = 'b4100000-0000-4000-8000-0000000000b4'),
  'GB|Nairobi', 'with Home & Away they show, labelled from abroad'
);

-- Coming Home: needs a trip credit without Home & Away.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-4000-8000-0000000000b5","role":"authenticated"}', true);
select throws_ok($$ select public.plan_trip('nairobi', current_date + 7, current_date + 20) $$, 'no_trip', 'a trip needs Home & Away or a trip credit');
reset role;
select set_config('request.jwt.claims', '', true);
update public.member_perks set trips = 1 where account_id = 'b5000000-0000-4000-8000-0000000000b5';
insert into public.member_perks (account_id, trips) select 'b5000000-0000-4000-8000-0000000000b5', 1
where not exists (select 1 from public.member_perks where account_id = 'b5000000-0000-4000-8000-0000000000b5');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-4000-8000-0000000000b5","role":"authenticated"}', true);
select lives_ok($$ select public.plan_trip('nairobi', current_date + 7, current_date + 20) $$, 'a trip credit plans a trip');
select is(
  (select visit_arrives from public.live_profile_cards where id = 'b5100000-0000-4000-8000-0000000000b5'),
  current_date + 7, 'from 14 days before landing they show as visiting'
);

select set_config('request.jwt.claims', '{"sub":"b6000000-0000-4000-8000-0000000000b6","role":"authenticated"}', true);
select throws_ok($$ select public.plan_trip('mombasa', current_date + 7, current_date + 9) $$, 'not_abroad', 'Coming Home is for members abroad');
reset role;
select set_config('request.jwt.claims', '', true);

-- Priced only in GBP / USD, and not on sale while those markets are waitlist.
select is(
  (select string_agg(country_code || ':' || currency, ',' order by country_code) from public.product_prices where sku = 'home_away_month'),
  'GB:GBP,US:USD', 'Home & Away is never priced in KES'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b4000000-0000-4000-8000-0000000000b4","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('b4000000-0000-4000-8000-0000000000b4', 'paystack', 'paystack:ha', 10, 9.99, 'GBP', 'GB', 'pending', 'home_away', 'home_away_month') $$,
  '42501', null, 'nothing is sold in a market that isn''t open'
);
reset role;

select * from finish();
rollback;
