-- Test people for trying the app before real members arrive.
-- Flagged on the account, labelled TEST on cards, like you back, say hello on match,
-- and removed in one call: select private.purge_test_profiles();

alter table public.accounts add column if not exists is_test boolean not null default false;

-- Members can't flag themselves as test.
create or replace function private.guard_account_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff() then return new; end if;
  new.is_banned := old.is_banned;
  new.deleted_at := old.deleted_at;
  new.role := old.role;
  new.invite_code := old.invite_code;
  new.founding_member := old.founding_member;
  new.is_test := old.is_test;
  return new;
end;
$$;

create or replace view public.live_profile_cards as
 select p.id,
    p.slug,
    p.display_name,
    p.birth_year,
    p.gender,
    p.looking_for,
    p.is_verified,
    p.status,
    p.boost_until,
    p.bio,
    p.prompts,
    c.slug as city_slug,
    c.name as city_name,
    a.slug as area_slug,
    a.name as area_name,
    m.storage_path as cover_path,
    coalesce(acc.is_test, false) as is_test
   from profiles p
     join locations c on c.id = p.city_id
     left join locations a on a.id = p.area_id
     left join profile_media m on m.profile_id = p.id and m.is_cover = true and m.status = 'approved'::media_status
     left join accounts acc on acc.id = p.account_id
  where p.status = 'live'::profile_status and p.flagged_reason is null and not profile_hidden_from_me(p.account_id);

-- A test person likes you back, which makes a match through the normal match trigger.
create or replace function private.test_like_back()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_actor_profile uuid;
begin
  if new.kind = 'pass' then return new; end if;
  select p.account_id into v_owner
  from public.profiles p join public.accounts a on a.id = p.account_id
  where p.id = new.profile_id and a.is_test;
  if v_owner is null or v_owner = new.actor_id then return new; end if;
  select id into v_actor_profile from public.profiles where account_id = new.actor_id;
  if v_actor_profile is null then return new; end if;
  insert into public.likes (actor_id, profile_id, kind)
  values (v_owner, v_actor_profile, 'like')
  on conflict (actor_id, profile_id) do update set kind = 'like';
  return new;
end;
$$;

drop trigger if exists likes_test_like_back on public.likes;
create trigger likes_test_like_back
after insert on public.likes
for each row execute function private.test_like_back();

-- On a match with a test person, they open the chat.
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
  values (new.id, v_test, 'Hi! I''m ' || coalesce(v_name, 'a test profile') || ', a SOKO test profile 👋 Send me a message to try the chat.');
  return new;
end;
$$;

drop trigger if exists conversations_test_hello on public.conversations;
create trigger conversations_test_hello
after insert on public.conversations
for each row execute function private.test_say_hello();

-- One call removes every test person and everything they touched.
create or replace function private.purge_test_profiles()
returns integer language plpgsql security definer set search_path = public, auth as $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.accounts where is_test;
  delete from auth.users where id in (select id from public.accounts where is_test);
  return v_count;
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
