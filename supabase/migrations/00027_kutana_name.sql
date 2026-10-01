-- App renamed to Kutana: test people introduce themselves with the new name.
create or replace function private.test_say_hello()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_a uuid;
  v_b uuid;
  v_test uuid;
  v_name text;
begin
  select account_a, account_b into v_a, v_b from public.matches where id = new.match_id;
  select id into v_test from public.accounts where id in (v_a, v_b) and is_test limit 1;
  if v_test is null then return new; end if;
  select display_name into v_name from public.profiles where account_id = v_test;
  insert into public.messages (conversation_id, sender_id, body)
  values (new.id, v_test, 'Hi! I''m ' || coalesce(v_name, 'a test profile') || ', a Kutana test profile 👋 Send me a message to try the chat.');
  return new;
end;
$$;

revoke execute on function private.test_say_hello() from public, anon, authenticated;
