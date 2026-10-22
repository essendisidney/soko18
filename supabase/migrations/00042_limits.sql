-- Limits that live in the database, so they hold even when someone calls the API directly
-- (the app's in-memory limits reset per server instance). Also: a banned or deleted account
-- can't send messages, likes or reports the moment it's banned, not when its token expires.
-- Limits are generous: they only stop scripts and spam, never a real person.

create or replace function private.assert_active(p_uid uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if exists (select 1 from public.accounts where id = p_uid and (is_banned or deleted_at is not null)) then
    raise exception 'banned';
  end if;
end;
$$;

create or replace function private.limit_messages()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or coalesce(current_setting('soko.system', true), '') = 'on' then return new; end if;
  perform private.assert_active(v_uid);
  if (select count(*) from public.messages where sender_id = v_uid and created_at > now() - interval '1 minute') >= 30
     or (select count(*) from public.messages where sender_id = v_uid and created_at > now() - interval '1 day') >= 500 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_limit on public.messages;
create trigger messages_limit before insert on public.messages
for each row execute function private.limit_messages();

create or replace function private.limit_likes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or coalesce(current_setting('soko.system', true), '') = 'on' then return new; end if;
  perform private.assert_active(v_uid);
  if (select count(*) from public.likes where actor_id = v_uid and created_at > now() - interval '1 minute') >= 60
     or (select count(*) from public.likes where actor_id = v_uid and created_at > now() - interval '1 day') >= 2000 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;

drop trigger if exists likes_limit on public.likes;
create trigger likes_limit before insert on public.likes
for each row execute function private.limit_likes();

create or replace function private.limit_reports()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then return new; end if;
  if (select count(*) from public.reports where reporter_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_limit on public.reports;
create trigger reports_limit before insert on public.reports
for each row execute function private.limit_reports();

-- Panic and share-my-date: a daily cap per member, kept in the database.
create table if not exists public.safety_sends (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null check (kind in ('panic', 'share')),
  created_at timestamptz not null default now()
);
create index if not exists safety_sends_account_idx on public.safety_sends (account_id, created_at desc);
alter table public.safety_sends enable row level security;
-- No policies: written only through record_safety_send().

create or replace function public.record_safety_send(p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_cap integer := case p_kind when 'panic' then 10 when 'share' then 20 else 0 end;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  if v_cap = 0 then raise exception 'invalid'; end if;
  perform private.assert_active(v_uid);
  if (select count(*) from public.safety_sends
      where account_id = v_uid and kind = p_kind and created_at > now() - interval '1 day') >= v_cap then
    raise exception 'rate_limited';
  end if;
  insert into public.safety_sends (account_id, kind) values (v_uid, p_kind);
end;
$$;

revoke all on function private.assert_active(uuid) from public, anon, authenticated;
revoke all on function public.record_safety_send(text) from public, anon;
grant execute on function public.record_safety_send(text) to authenticated;
