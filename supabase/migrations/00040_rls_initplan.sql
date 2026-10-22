-- Performance (Supabase advisor 0003 auth_rls_initplan): wrap auth.uid() in policies as
-- (select auth.uid()) so Postgres evaluates it once per query instead of once per row.
-- Same rules, same results; only faster as tables grow. Idempotent: already-wrapped calls are kept.

do $$
declare
  r record;
  q text;
  c text;
begin
  for r in select tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    q := r.qual;
    c := r.with_check;
    if q is not null then
      q := replace(replace(replace(q, 'SELECT auth.uid()', '@@WRAPPED@@'), 'auth.uid()', '(select auth.uid())'), '@@WRAPPED@@', 'SELECT auth.uid()');
    end if;
    if c is not null then
      c := replace(replace(replace(c, 'SELECT auth.uid()', '@@WRAPPED@@'), 'auth.uid()', '(select auth.uid())'), '@@WRAPPED@@', 'SELECT auth.uid()');
    end if;
    if q is distinct from r.qual or c is distinct from r.with_check then
      execute format(
        'alter policy %I on public.%I %s %s',
        r.policyname,
        r.tablename,
        case when q is distinct from r.qual then 'using (' || q || ')' else '' end,
        case when c is distinct from r.with_check then 'with check (' || c || ')' else '' end
      );
    end if;
  end loop;
end;
$$;

-- Indexes for foreign keys used on hot paths (advisor 0001).
create index if not exists matches_account_b_idx on public.matches (account_b);
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);
create index if not exists transactions_account_idx on public.transactions (account_id, created_at desc);
create index if not exists subscriptions_account_idx on public.subscriptions (account_id);
create index if not exists reports_reporter_idx on public.reports (reporter_id);
create index if not exists favorites_profile_idx on public.favorites (profile_id);
create index if not exists profiles_area_idx on public.profiles (area_id);
create index if not exists ledger_entries_tx_idx on public.ledger_entries (transaction_id);

-- Signed-out visitors never need to ask whether test-mode payments are on.
revoke all on function public.payments_sandbox_on() from public, anon;
grant execute on function public.payments_sandbox_on() to authenticated;
