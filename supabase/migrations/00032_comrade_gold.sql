-- Comrade Gold: Gold at a student price, for verified students only (see 00030_campuses.sql).
-- It is ordinary Gold once paid — same settlement, ledger row and entitlements — so nothing else changes.
-- Kenya only for now. Only accounts in campus_members can start a checkout for it.

alter table public.products add column if not exists requires_campus boolean not null default false;

insert into public.products (sku, title, line, amount_kes, kind, plan, days, quantity, bonus_super_likes, bonus_boosts, is_active, sort_order, requires_campus)
values
  ('comrade_week', 'Comrade Gold · 7 days', 'Gold at a student price. Verified students only.', 49, 'plan', 'gold', 7, 1, 1, 0, true, 12, true),
  ('comrade_month', 'Comrade Gold · 30 days', 'Gold at a student price, 3 Super Likes. Verified students only.', 199, 'plan', 'gold', 30, 1, 3, 0, true, 22, true)
on conflict (sku) do update set
  title = excluded.title,
  line = excluded.line,
  amount_kes = excluded.amount_kes,
  kind = excluded.kind,
  plan = excluded.plan,
  days = excluded.days,
  quantity = excluded.quantity,
  bonus_super_likes = excluded.bonus_super_likes,
  bonus_boosts = excluded.bonus_boosts,
  requires_campus = excluded.requires_campus;

insert into public.product_prices (sku, country_code, currency, amount) values
  ('comrade_week', 'KE', 'KES', 49),
  ('comrade_month', 'KE', 'KES', 199)
on conflict (sku, country_code) do update set amount = excluded.amount, currency = excluded.currency;

-- Same rules as 00026_intasend.sql, plus: student products need a verified campus.
drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (
    account_id = (select auth.uid())
    and status = 'pending'
    and provider in ('sandbox', 'mpesa', 'paystack', 'intasend')
    and checkout_request_id is null
    and mpesa_receipt is null
    and settled_at is null
    and exists (select 1 from public.products p where p.sku = transactions.sku and p.is_active)
    and exists (
      select 1 from public.product_prices pp
      join public.markets m on m.country_code = pp.country_code and m.status = 'live'
      where pp.sku = transactions.sku
        and pp.country_code = transactions.country_code
        and pp.currency = transactions.currency
        and pp.amount = transactions.amount
    )
    and (provider <> 'mpesa' or transactions.currency = 'KES')
    and (
      not exists (select 1 from public.products p where p.sku = transactions.sku and p.requires_campus)
      or exists (select 1 from public.campus_members cm where cm.account_id = (select auth.uid()))
    )
  );
