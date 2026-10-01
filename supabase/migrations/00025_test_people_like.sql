-- While test people exist, up to 3 in the same city like each new real profile,
-- so "Likes you", badges and the Gold upsell can be tried.
create or replace function private.test_people_like(p_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_city uuid;
  v_owner uuid;
begin
  select city_id, account_id into v_city, v_owner from public.profiles where id = p_profile;
  if v_owner is null or exists (select 1 from public.accounts where id = v_owner and is_test) then return; end if;
  insert into public.likes (actor_id, profile_id, kind)
  select p.account_id, p_profile, 'like'
  from public.profiles p join public.accounts a on a.id = p.account_id
  where a.is_test and p.city_id = v_city and p.status = 'live'
  order by random()
  limit 3
  on conflict (actor_id, profile_id) do nothing;
end;
$$;

create or replace function private.profile_test_likes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform private.test_people_like(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_test_likes on public.profiles;
create trigger profiles_test_likes
after insert on public.profiles
for each row execute function private.profile_test_likes();

select private.test_people_like(p.id)
from public.profiles p join public.accounts a on a.id = p.account_id
where not a.is_test;

revoke execute on all functions in schema private from public, anon, authenticated;
