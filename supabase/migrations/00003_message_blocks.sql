-- Block severs send. Participants still read history.
-- Realtime INSERT on messages is RLS-filtered.

drop policy if exists messages_insert on public.messages;

create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = conversation_id
        and (m.account_a = auth.uid() or m.account_b = auth.uid())
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = m.account_a and b.blocked_id = m.account_b)
             or (b.blocker_id = m.account_b and b.blocked_id = m.account_a)
        )
    )
  );

-- Block severs send. Participants still read history.
-- Realtime INSERT on messages is RLS-filtered.

drop policy if exists messages_insert on public.messages;

create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = conversation_id
        and (m.account_a = auth.uid() or m.account_b = auth.uid())
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = m.account_a and b.blocked_id = m.account_b)
             or (b.blocker_id = m.account_b and b.blocked_id = m.account_a)
        )
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

