begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- The scam patterns, in English, Kiswahili and Sheng.
select is(private.scam_kind('Hi, can you send me fare first ndio nikuje?'), 'money', 'send fare');
select is(private.scam_kind('Nitumie pesa kidogo ya bundles'), 'money', 'nitumie pesa');
select is(private.scam_kind('Buy me an iTunes gift card'), 'money', 'gift cards');
select is(private.scam_kind('I trade crypto, I can double your money'), 'money', 'crypto');
select is(private.scam_kind('Text me on WhatsApp 0712 345 678'), 'off_platform', 'moving to WhatsApp');
select is(private.scam_kind('Coffee at Java on Saturday? I will pay, promise'), null, 'a normal date chat is not flagged');

-- In a real chat: flagged for the recipient, logged without text.
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a7000000-0000-4000-8000-0000000000a7', 'authenticated', 'authenticated', 'x@scam-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('a8000000-0000-4000-8000-0000000000a8', 'authenticated', 'authenticated', 'y@scam-test.example', now(), '{"provider":"email"}', '{}', now(), now()),
  ('a9000000-0000-4000-8000-0000000000a9', 'authenticated', 'authenticated', 'z@scam-test.example', now(), '{"provider":"email"}', '{}', now(), now());
insert into public.accounts (id) values
  ('a7000000-0000-4000-8000-0000000000a7'), ('a8000000-0000-4000-8000-0000000000a8'), ('a9000000-0000-4000-8000-0000000000a9')
on conflict (id) do nothing;
insert into public.profiles (id, account_id, slug, display_name, city_id, status)
select v.id::uuid, v.account_id::uuid, v.slug, v.name, loc.id, 'live'
from (values
  ('a8100000-0000-4000-8000-0000000000a8', 'a8000000-0000-4000-8000-0000000000a8', 'scam-y', 'Yusuf'),
  ('a9100000-0000-4000-8000-0000000000a9', 'a9000000-0000-4000-8000-0000000000a9', 'scam-z', 'Zawadi')
) as v(id, account_id, slug, name)
cross join public.locations loc
where loc.slug = 'nairobi' and loc.kind = 'city';
insert into public.matches (id, account_a, account_b, profile_id) values
  ('a7100000-0000-4000-8000-0000000000a7', 'a7000000-0000-4000-8000-0000000000a7', 'a8000000-0000-4000-8000-0000000000a8', 'a8100000-0000-4000-8000-0000000000a8'),
  ('a7200000-0000-4000-8000-0000000000a7', 'a7000000-0000-4000-8000-0000000000a7', 'a9000000-0000-4000-8000-0000000000a9', 'a9100000-0000-4000-8000-0000000000a9');
insert into public.conversations (id, match_id) values
  ('a7300000-0000-4000-8000-0000000000a7', 'a7100000-0000-4000-8000-0000000000a7'),
  ('a7400000-0000-4000-8000-0000000000a7', 'a7200000-0000-4000-8000-0000000000a7');

insert into public.messages (conversation_id, sender_id, body, scam_flag)
values ('a7300000-0000-4000-8000-0000000000a7', 'a7000000-0000-4000-8000-0000000000a7', 'Please send me fare first', null);
select is(
  (select scam_flag from public.messages where conversation_id = 'a7300000-0000-4000-8000-0000000000a7' order by created_at desc limit 1),
  'money', 'the recipient gets a warning on an early money ask'
);
select is((select count(*)::int from public.scam_flags where sender_id = 'a7000000-0000-4000-8000-0000000000a7'), 1, 'the flag is logged');
select is(
  (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'scam_flags' and column_name in ('body', 'text', 'message')),
  0, 'the log never holds the message text'
);

-- Repeat money asks across chats: one account case, then money asks are held.
insert into public.messages (conversation_id, sender_id, body) values
  ('a7400000-0000-4000-8000-0000000000a7', 'a7000000-0000-4000-8000-0000000000a7', 'Can you lend me money for rent'),
  ('a7400000-0000-4000-8000-0000000000a7', 'a7000000-0000-4000-8000-0000000000a7', 'Use my till number');
select is(
  (select count(*)::int from public.moderation_cases where target_type = 'account' and target_id = 'a7000000-0000-4000-8000-0000000000a7'),
  1, 'repeat offenders go to staff review'
);
insert into public.messages (conversation_id, sender_id, body)
values ('a7300000-0000-4000-8000-0000000000a7', 'a7000000-0000-4000-8000-0000000000a7', 'Send money via mpesa now');
select is(
  (select held from public.messages where body = 'Send money via mpesa now'), true, 'while under review, their money asks are held'
);

-- Members can't clear a flag.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a8000000-0000-4000-8000-0000000000a8","role":"authenticated"}', true);
update public.messages set scam_flag = null where conversation_id = 'a7300000-0000-4000-8000-0000000000a7';
reset role;
select set_config('request.jwt.claims', '', true);
select is(
  (select scam_flag from public.messages where body = 'Please send me fare first'), 'money', 'members cannot remove the warning'
);

select * from finish();
rollback;
