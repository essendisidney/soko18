begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- S is 26 and buys Salamu, R is 22, O is 35.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('c1000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 's@salamu-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('c2000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'r@salamu-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('c3000000-0000-4000-8000-0000000000c3', 'authenticated', 'authenticated', 'o@salamu-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('c1000000-0000-4000-8000-0000000000c1'), ('c2000000-0000-4000-8000-0000000000c2'), ('c3000000-0000-4000-8000-0000000000c3')
on conflict (id) do nothing;
update public.accounts set date_of_birth = (current_date - interval '26 years 2 months')::date where id = 'c1000000-0000-4000-8000-0000000000c1';
update public.accounts set date_of_birth = (current_date - interval '22 years 2 months')::date where id = 'c2000000-0000-4000-8000-0000000000c2';
update public.accounts set date_of_birth = (current_date - interval '35 years 2 months')::date where id = 'c3000000-0000-4000-8000-0000000000c3';

insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('c1100000-0000-4000-8000-0000000000c1', 'c1000000-0000-4000-8000-0000000000c1', 'salamu-s', 'Sifa'),
  ('c2100000-0000-4000-8000-0000000000c2', 'c2000000-0000-4000-8000-0000000000c2', 'salamu-r', 'Rehema'),
  ('c3100000-0000-4000-8000-0000000000c3', 'c3000000-0000-4000-8000-0000000000c3', 'salamu-o', 'Otieno')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';

-- Buying: checkout accepts the KES 59 / 249 prices and settlement credits the balance with a ledger row.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select throws_ok('select public.send_salamu(''c2100000-0000-4000-8000-0000000000c2'', ''Habari!'')', 'no_salamu', 'no Salamu, no message');
select throws_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('c1000000-0000-4000-8000-0000000000c1', 'intasend', 'intasend:sal-cheap', 49, 49, 'KES', 'KE', 'pending', 'salamu', 'salamu_1') $$,
  '42501', null, 'Salamu cannot be bought below its price'
);
select lives_ok(
  $$ insert into public.transactions (id, account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('c1900000-0000-4000-8000-0000000000c1', 'c1000000-0000-4000-8000-0000000000c1', 'intasend', 'intasend:sal-5', 249, 249, 'KES', 'KE', 'pending', 'salamu', 'salamu_5') $$,
  'checkout accepts 5 Salamu at KES 249'
);
reset role;
select set_config('request.jwt.claims', '', true);
select private.settle_transaction('c1900000-0000-4000-8000-0000000000c1', 'RCPT-SAL');
select is((select salamu from public.member_perks where account_id = 'c1000000-0000-4000-8000-0000000000c1'), 5, 'settling adds 5 Salamu');
select is(
  (select count(*)::int from public.ledger_entries where transaction_id = 'c1900000-0000-4000-8000-0000000000c1' and type = 'salamu' and direction = 'credit'),
  1, 'every Salamu purchase has a ledger credit'
);

-- Sending spends one, counts as a like, and can't be repeated for free or paid twice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
select is((public.send_salamu('c2100000-0000-4000-8000-0000000000c2', 'Habari! Your matatu prompt made me laugh.') ->> 'left')::int, 4, 'sending spends one Salamu');
select throws_ok('select public.send_salamu(''c2100000-0000-4000-8000-0000000000c2'', ''Again'')', 'already_sent', 'one Salamu per person');
select is((public.my_entitlements() ->> 'salamu')::int, 4, 'a refused send is not charged');
reset role;
select set_config('request.jwt.claims', '', true);
select is(
  (select kind from public.likes where actor_id = 'c1000000-0000-4000-8000-0000000000c1' and profile_id = 'c2100000-0000-4000-8000-0000000000c2'),
  'like', 'a Salamu counts as a like, so a like back is a match'
);

-- The age-band rule applies: 35 can't Salamu 22.
update public.member_perks set salamu = 3 where account_id = 'c3000000-0000-4000-8000-0000000000c3';
insert into public.member_perks (account_id, salamu) select 'c3000000-0000-4000-8000-0000000000c3', 3
where not exists (select 1 from public.member_perks where account_id = 'c3000000-0000-4000-8000-0000000000c3');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c3000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
select throws_ok('select public.send_salamu(''c2100000-0000-4000-8000-0000000000c2'', ''Hello'')', 'age_band', '30+ cannot Salamu an 18–25 member');
reset role;
select set_config('request.jwt.claims', '', true);
select is((select salamu from public.member_perks where account_id = 'c3000000-0000-4000-8000-0000000000c3'), 3, 'a blocked send is not charged');

-- The recipient reads it free and can ignore it.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);
select is((public.my_intros() -> 0 ->> 'kind'), 'salamu', 'the recipient sees it, marked Salamu, without paying');
select public.ignore_intro((public.my_intros() -> 0 ->> 'id')::uuid);
select is(jsonb_array_length(public.my_intros()), 0, 'ignoring hides it');
reset role;
select set_config('request.jwt.claims', '', true);

-- Looking-for tags: only the allowed set, and nothing about tribe or ethnicity anywhere.
select throws_ok(
  $$ update public.profiles set intent_tags = array['tribe'] where id = 'c1100000-0000-4000-8000-0000000000c1' $$,
  '23514', null, 'tags outside the list are refused'
);
select lives_ok(
  $$ update public.profiles set intent_tags = array['faith', 'kids'] where id = 'c1100000-0000-4000-8000-0000000000c1' $$,
  'faith and kids are allowed tags'
);
select is(
  (select count(*)::int from information_schema.columns
   where table_schema in ('public', 'private') and (column_name ~* '(tribe|ethnic|kabila)')),
  0, 'no tribe or ethnicity column exists'
);

select * from finish();
rollback;
