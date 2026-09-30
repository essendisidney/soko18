-- Growth: new-message notifications (so push works for chats) and a staff funnel.

create or replace function private.message_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to uuid;
begin
  if new.held then
    return new;
  end if;
  select case when m.account_a = new.sender_id then m.account_b else m.account_a end into v_to
  from public.conversations c join public.matches m on m.id = c.match_id
  where c.id = new.conversation_id;
  -- One unread "new message" notice per conversation at a time; no spam.
  if v_to is not null and not exists (
    select 1 from public.notifications
    where account_id = v_to and kind = 'message' and read_at is null
      and href = '/messages' and created_at > now() - interval '10 minutes'
  ) then
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_to, 'message', 'New message', 'You have a new message.', '/messages');
  end if;
  return new;
end;
$$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
after insert on public.messages
for each row execute function private.message_notify();

-- Funnel for the last N days, built from real rows (no tracking scripts needed).
create or replace function public.staff_funnel(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'days', p_days,
    'signups', (select count(*) from public.accounts where created_at >= v_since),
    'confirmedAge', (select count(*) from public.accounts where created_at >= v_since and age_confirmed_at is not null),
    'profilesCreated', (select count(*) from public.profiles p join public.accounts a on a.id = p.account_id where a.created_at >= v_since),
    'profilesLive', (select count(*) from public.profiles p join public.accounts a on a.id = p.account_id where a.created_at >= v_since and p.status = 'live'),
    'verified', (select count(*) from public.profiles p join public.accounts a on a.id = p.account_id where a.created_at >= v_since and p.is_verified),
    'liked', (select count(distinct actor_id) from public.likes where created_at >= v_since and kind <> 'pass'),
    'matched', (select count(distinct x) from (select account_a x from public.matches where created_at >= v_since union all select account_b from public.matches where created_at >= v_since) t),
    'messaged', (select count(distinct sender_id) from public.messages where created_at >= v_since),
    'checkoutStarted', (select count(distinct account_id) from public.transactions where created_at >= v_since),
    'paid', (select count(distinct account_id) from public.transactions where created_at >= v_since and status = 'completed'),
    'revenueKes', (select coalesce(sum(amount_kes), 0) from public.transactions where created_at >= v_since and status = 'completed' and provider <> 'sandbox'),
    'bySku', coalesce((
      select jsonb_object_agg(sku, jsonb_build_object('count', n, 'kes', kes))
      from (
        select sku, count(*) n, sum(amount_kes) kes from public.transactions
        where created_at >= v_since and status = 'completed' and provider <> 'sandbox' and sku is not null
        group by sku
      ) s
    ), '{}'::jsonb)
  );
end;
$$;

revoke all on function public.staff_funnel(integer) from public, anon;
grant execute on function public.staff_funnel(integer) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
