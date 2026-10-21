-- "Someone likes you": a real like tells its owner, at most once a day, so nobody misses it.
-- Super Likes already notify, and a like that makes a match gets "It's a match" instead.
-- Notifications push to the phone through private.notify_push() (00018).

create or replace function private.notify_like_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
begin
  if new.kind <> 'like' then return new; end if;
  select account_id into v_owner from public.profiles where id = new.profile_id;
  if v_owner is null or v_owner = new.actor_id then return new; end if;
  -- Matched: they already got "It's a match".
  if exists (
    select 1 from public.matches
    where account_a = least(new.actor_id, v_owner) and account_b = greatest(new.actor_id, v_owner)
  ) then
    return new;
  end if;
  -- One a day is enough.
  if exists (
    select 1 from public.notifications
    where account_id = v_owner and kind = 'like' and title = 'Someone likes you'
      and created_at > now() - interval '20 hours'
  ) then
    return new;
  end if;
  insert into public.notifications (account_id, kind, title, body, href)
  values (v_owner, 'like', 'Someone likes you', 'Open Kutana to see who.', '/likes');
  return new;
end;
$$;

revoke all on function private.notify_like_owner() from public, anon, authenticated;

drop trigger if exists likes_notify_owner on public.likes;
create trigger likes_notify_owner
after insert on public.likes
for each row execute function private.notify_like_owner();
