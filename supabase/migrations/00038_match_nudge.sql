-- "Your match is waiting": a match with no messages after a day gets one reminder, to both people.
-- Never twice for the same match, never after a block, never for removed or banned accounts.
-- Runs daily from Vercel Cron (/api/cron/nudges) with the service role.

create table if not exists public.match_nudges (
  match_id uuid primary key references public.matches (id) on delete cascade,
  nudged_at timestamptz not null default now()
);

alter table public.match_nudges enable row level security;
-- No policies: only the service role reads or writes it.

create or replace function public.run_match_nudges()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  v_match record;
begin
  for v_match in
    select m.id, m.account_a, m.account_b
    from public.matches m
    join public.conversations c on c.match_id = m.id
    join public.accounts a on a.id = m.account_a
    join public.accounts b on b.id = m.account_b
    where m.created_at < now() - interval '24 hours'
      and m.created_at > now() - interval '7 days'
      and not exists (select 1 from public.messages x where x.conversation_id = c.id)
      and not exists (select 1 from public.match_nudges n where n.match_id = m.id)
      and not exists (
        select 1 from public.blocks k
        where (k.blocker_id = m.account_a and k.blocked_id = m.account_b)
           or (k.blocker_id = m.account_b and k.blocked_id = m.account_a)
      )
      and a.deleted_at is null and b.deleted_at is null
      and not a.is_banned and not b.is_banned
    limit 500
  loop
    insert into public.match_nudges (match_id) values (v_match.id) on conflict do nothing;
    if found then
      insert into public.notifications (account_id, kind, title, body, href)
      values
        (v_match.account_a, 'match', 'Your match is waiting', 'Nobody has said hi yet. Be the one who does.', '/matches'),
        (v_match.account_b, 'match', 'Your match is waiting', 'Nobody has said hi yet. Be the one who does.', '/matches');
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.run_match_nudges() from public, anon, authenticated;
grant execute on function public.run_match_nudges() to service_role;
