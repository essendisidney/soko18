begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

-- G gives, R receives (they matched), X is a stranger.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('c7000000-0000-4000-8000-0000000000c7', 'authenticated', 'authenticated', 'g@gift-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('c8000000-0000-4000-8000-0000000000c8', 'authenticated', 'authenticated', 'r@gift-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('c9000000-0000-4000-8000-0000000000c9', 'authenticated', 'authenticated', 'x@gift-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('c7000000-0000-4000-8000-0000000000c7'), ('c8000000-0000-4000-8000-0000000000c8'), ('c9000000-0000-4000-8000-0000000000c9')
on conflict (id) do nothing;
insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('c7100000-0000-4000-8000-0000000000c7', 'c7000000-0000-4000-8000-0000000000c7', 'gift-g', 'Gathoni'),
  ('c8100000-0000-4000-8000-0000000000c8', 'c8000000-0000-4000-8000-0000000000c8', 'gift-r', 'Rafiki'),
  ('c9100000-0000-4000-8000-0000000000c9', 'c9000000-0000-4000-8000-0000000000c9', 'gift-x', 'Xavier')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';
insert into public.matches (account_a, account_b, profile_id)
values ('c7000000-0000-4000-8000-0000000000c7', 'c8000000-0000-4000-8000-0000000000c8', 'c8100000-0000-4000-8000-0000000000c8');

select is(
  (select amount from public.product_prices where sku = 'gift_gold_week' and country_code = 'KE'),
  (select amount from public.product_prices where sku = 'gold_week' and country_code = 'KE'),
  'a gift costs exactly what the perk costs'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c7000000-0000-4000-8000-0000000000c7","role":"authenticated"}', true);
select throws_ok($$ select public.start_gift('c9100000-0000-4000-8000-0000000000c9', 'gift_super_5') $$, 'not_matched', 'gifts only go to matches');
create temp table _g on commit drop as select (public.start_gift('c8100000-0000-4000-8000-0000000000c8', 'gift_super_5') ->> 'giftId')::uuid as id;
select throws_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('c7000000-0000-4000-8000-0000000000c7', 'intasend', 'intasend:g0', 199, 199, 'KES', 'KE', 'pending', 'super_like', 'gift_super_5') $$,
  '42501', null, 'a gift payment must name the gift'
);
select throws_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku, gift_id)
     values ('c7000000-0000-4000-8000-0000000000c7', 'intasend', 'intasend:g1', 199, 199, 'KES', 'KE', 'pending', 'super_like', 'super_5', (select id from _g)) $$,
  '42501', null, 'only gift SKUs can carry a gift'
);
select lives_ok(
  $$ insert into public.transactions (id, account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku, gift_id)
     values ('c7900000-0000-4000-8000-0000000000c7', 'c7000000-0000-4000-8000-0000000000c7', 'intasend', 'intasend:g2', 199, 199, 'KES', 'KE', 'pending', 'super_like', 'gift_super_5', (select id from _g)) $$,
  'the giver pays for their own gift'
);
reset role;
select set_config('request.jwt.claims', '', true);

create temp table _before on commit drop as
select (select super_likes from public.member_perks where account_id = 'c8000000-0000-4000-8000-0000000000c8') as r_supers;
select private.settle_transaction('c7900000-0000-4000-8000-0000000000c7', 'RCPT-G');
select is((select status from public.gifts where id = (select id from _g)), 'sent', 'paid gifts wait for the recipient');
select is(
  (select string_agg(type::text || '/' || direction::text || '/' || account_id::text, ',' order by direction::text)
   from public.ledger_entries where transaction_id = 'c7900000-0000-4000-8000-0000000000c7'),
  'super_like/credit/c7000000-0000-4000-8000-0000000000c7,payment/debit/c7000000-0000-4000-8000-0000000000c7',
  'the ledger records the giver''s purchase'
);
select is(
  (select super_likes from public.member_perks where account_id = 'c8000000-0000-4000-8000-0000000000c8'),
  (select r_supers from _before), 'nothing reaches the recipient until they accept'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c8000000-0000-4000-8000-0000000000c8","role":"authenticated"}', true);
select is(jsonb_array_length(public.my_gifts() -> 'received'), 1, 'the recipient sees the gift');
select is(public.respond_gift((select id from _g), true) ->> 'status', 'accepted', 'they accept');
reset role;
select set_config('request.jwt.claims', '', true);
select is(
  (select super_likes from public.member_perks where account_id = 'c8000000-0000-4000-8000-0000000000c8'),
  (select r_supers from _before) + 5, 'accepting adds the perk to the recipient'
);

-- A declined gift goes back to the giver, never as cash.
insert into public.gifts (id, giver_id, recipient_id, sku, status, paid_at)
values ('c7a00000-0000-4000-8000-0000000000c7', 'c7000000-0000-4000-8000-0000000000c7', 'c8000000-0000-4000-8000-0000000000c8', 'gift_boost_1', 'sent', now());
create temp table _gb on commit drop as
select (select boosts from public.member_perks where account_id = 'c7000000-0000-4000-8000-0000000000c7') as g_boosts;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c8000000-0000-4000-8000-0000000000c8","role":"authenticated"}', true);
select public.respond_gift('c7a00000-0000-4000-8000-0000000000c7', false);
reset role;
select set_config('request.jwt.claims', '', true);
select is(
  (select boosts from public.member_perks where account_id = 'c7000000-0000-4000-8000-0000000000c7'),
  (select g_boosts from _gb) + 1, 'a declined gift becomes the giver''s'
);

-- Weekly cap.
update private.settings set value = '2' where key = 'gifts_weekly_max';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c7000000-0000-4000-8000-0000000000c7","role":"authenticated"}', true);
select throws_ok($$ select public.start_gift('c8100000-0000-4000-8000-0000000000c8', 'gift_boost_1') $$, 'gift_limit', 'gifts are capped per week');
reset role;

select * from finish();
rollback;
