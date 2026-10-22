begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('e9000000-0000-4000-8000-0000000000e9', 'authenticated', 'authenticated', 'p@pay-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values ('e9000000-0000-4000-8000-0000000000e9') on conflict (id) do nothing;

select is((select value from private.settings where key = 'payments_sandbox'), 'off', 'test-mode payments are off by default');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e9000000-0000-4000-8000-0000000000e9', true);
select set_config('request.jwt.claims', '{"sub":"e9000000-0000-4000-8000-0000000000e9","role":"authenticated"}', true);

select throws_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('e9000000-0000-4000-8000-0000000000e9', 'sandbox', 'sandbox:x', 149, 149, 'KES', 'KE', 'pending', 'gold', 'gold_week') $$,
  '42501', null, 'members cannot start a test-mode payment while it is off'
);
select throws_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku, provider_reference)
     values ('e9000000-0000-4000-8000-0000000000e9', 'intasend', 'intasend:x', 149, 149, 'KES', 'KE', 'pending', 'gold', 'gold_week', 'paystack:123') $$,
  '42501', null, 'members cannot pre-fill the settlement reference'
);
select throws_ok(
  $$ insert into public.transactions (account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('e9000000-0000-4000-8000-0000000000e9', 'intasend', 'intasend:y', 999999, 149, 'KES', 'KE', 'pending', 'gold', 'gold_week') $$,
  '42501', null, 'amount_kes must match the price'
);
select lives_ok(
  $$ insert into public.transactions (id, account_id, provider, provider_ref, amount_kes, amount, currency, country_code, status, purpose, sku)
     values ('e9100000-0000-4000-8000-0000000000e9', 'e9000000-0000-4000-8000-0000000000e9', 'intasend', 'intasend:z', 149, 149, 'KES', 'KE', 'pending', 'gold', 'gold_week') $$,
  'a normal checkout row still works'
);
select throws_ok('select public.settle_sandbox_transaction(''e9100000-0000-4000-8000-0000000000e9'')', 'forbidden', 'test-mode settlement is refused');
reset role;

-- A Daraja (M-Pesa) callback can't complete an IntaSend payment that shares the checkout id column.
update public.transactions set checkout_request_id = 'INV-SHARED' where id = 'e9100000-0000-4000-8000-0000000000e9';
select throws_ok($$ select public.settle_mpesa_checkout('INV-SHARED', 'RCPT1', 149) $$, 'not_found', 'M-Pesa settle ignores IntaSend rows');

select * from finish();
rollback;
