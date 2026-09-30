-- Web push: members' browser subscriptions, and a hook that asks the app to deliver
-- every new in-app notification as a push (via pg_net; no-op until configured).

create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_account_idx on public.push_subscriptions (account_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions
  for all using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

grant select, insert, delete on table public.push_subscriptions to authenticated;

create or replace function private.notify_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := (select value from private.settings where key = 'push_url');
  v_secret text := (select value from private.settings where key = 'push_secret');
begin
  if v_url is null or v_secret is null then
    return new;
  end if;
  if not exists (select 1 from public.push_subscriptions where account_id = new.account_id) then
    return new;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notificationId', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret)
  );
  return new;
exception when others then
  -- Push is best-effort. Never block the notification itself.
  return new;
end;
$$;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
after insert on public.notifications
for each row execute function private.notify_push();

revoke execute on all functions in schema private from public, anon, authenticated;
