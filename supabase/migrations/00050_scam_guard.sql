-- K3b: scam guard. Like the paid-services filter, but for early money asks in chat: M-Pesa,
-- fare, loans, gift cards, crypto, and pulling someone off Kutana in the first messages.
--
-- The message is still delivered (most are innocent), with a calm warning shown to the
-- recipient in the thread. Only the flag is logged outside the thread (scam_flags: who, which
-- conversation, what kind, when — never the text). A sender with 3+ money flags across 2+
-- conversations in a week gets an account case on /admin/queue, and from then on their money
-- asks are held until staff review.

create or replace function private.scam_kind(p_text text)
returns text language sql immutable set search_path = public as $$
  select case
    when coalesce(p_text, '') ~* any (array[
      '\m(send|tuma|nitumie|nitumia|lend|loan|borrow|niazime|nikopeshe|nisaidie na|help me with)\M.{0,40}\m(money|pesa|cash|fare|nauli|mpesa|m-pesa|doh|ganji|chapaa|mkwanja|airtime|bundles?|ksh|kes|bob)\M',
      '\m(fare|nauli)\M.{0,30}\m(first|kwanza|before|ndio nikuje)\M',
      '\m(paybill|till ?(number|no)|buy ?goods|send ?money)\M',
      '\m(gift ?cards?|itunes|steam ?card|google ?play ?card|amazon ?card|apple ?card)\M',
      '\m(bitcoin|btc|crypto|usdt|binance|forex|investment opportunity|double your)\M',
      '\m(western union|moneygram|wire transfer|world ?remit)\M'
    ]) then 'money'
    when coalesce(p_text, '') ~* any (array[
      '\m(whatsapp|whats app|watsapp|wapp|telegram|signal|wechat|snapchat|snap me|ig me|dm me on)\M',
      '(\+?254|\m0)\s*[17]\d{2}[\s.-]*\d{3}[\s.-]*\d{3}'
    ]) then 'off_platform'
    else null
  end;
$$;

alter table public.messages add column if not exists scam_flag text check (scam_flag in ('money', 'off_platform'));

create table if not exists public.scam_flags (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.messages (id) on delete cascade,
  sender_id uuid not null references public.accounts (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  kind text not null check (kind in ('money', 'off_platform')),
  created_at timestamptz not null default now()
);
create index if not exists scam_flags_sender_idx on public.scam_flags (sender_id, created_at desc);
alter table public.scam_flags enable row level security;
drop policy if exists scam_flags_staff on public.scam_flags;
create policy scam_flags_staff on public.scam_flags for select using (public.is_staff());
grant select on table public.scam_flags to authenticated;

-- Before insert: set the flag (members can't), hold money asks from someone already under review.
-- Before update: nobody but staff changes the flag.
create or replace function private.message_scam_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_kind text;
  v_count integer;
  v_age interval;
begin
  if tg_op = 'UPDATE' then
    if not public.is_staff() then new.scam_flag := old.scam_flag; end if;
    return new;
  end if;
  new.scam_flag := null;
  v_kind := private.scam_kind(new.body);
  if v_kind is null then return new; end if;
  select count(*), now() - min(created_at) into v_count, v_age
  from public.messages where conversation_id = new.conversation_id;
  -- Early only: money asks in the first 30 messages or week; off-Kutana in the first 10 messages.
  if (v_kind = 'money' and (v_count < 30 or coalesce(v_age, interval '0') < interval '7 days'))
     or (v_kind = 'off_platform' and v_count < 10) then
    new.scam_flag := v_kind;
    if v_kind = 'money' and exists (
      select 1 from public.moderation_cases
      where target_type = 'account' and target_id = new.sender_id and status in ('open', 'in_review')
    ) then
      new.held := true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_scam_check on public.messages;
create trigger messages_scam_check
before insert or update on public.messages
for each row execute function private.message_scam_check();

-- After insert: log the flag (no text) and open one account case for repeat money asks.
create or replace function private.message_scam_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.scam_flag is null then return new; end if;
  insert into public.scam_flags (message_id, sender_id, conversation_id, kind)
  values (new.id, new.sender_id, new.conversation_id, new.scam_flag);
  if new.scam_flag = 'money'
     and (select count(distinct conversation_id) from public.scam_flags
          where sender_id = new.sender_id and kind = 'money' and created_at > now() - interval '7 days') >= 2
     and (select count(*) from public.scam_flags
          where sender_id = new.sender_id and kind = 'money' and created_at > now() - interval '7 days') >= 3
     and not exists (
       select 1 from public.moderation_cases
       where target_type = 'account' and target_id = new.sender_id and status in ('open', 'in_review')
     ) then
    insert into public.moderation_cases (target_type, target_id, status, opened_by)
    values ('account', new.sender_id, 'open', null);
  end if;
  return new;
end;
$$;

drop trigger if exists messages_scam_log on public.messages;
create trigger messages_scam_log
after insert on public.messages
for each row execute function private.message_scam_log();

revoke all on function private.scam_kind(text) from public, anon, authenticated;
revoke all on function private.message_scam_check() from public, anon, authenticated;
revoke all on function private.message_scam_log() from public, anon, authenticated;
