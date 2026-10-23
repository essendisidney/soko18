-- K7: owner economics, admin only. Real numbers from the ledger, never estimates.
--
-- Revenue is settled, non-sandbox payments from real (not test) accounts, by market and currency,
-- never summed across currencies. Net subtracts payment fees only where a fee is recorded in the
-- ledger (nothing is guessed). Costs are typed in by the admin each month. Break-even uses Kenyan
-- shillings only: paying members needed = costs ÷ net ARPPU, and members needed at today's
-- paying share. Everything is empty until real payments exist.

create table if not exists public.admin_costs (
  month date not null check (extract(day from month) = 1),
  category text not null check (category in ('hosting', 'moderation', 'sms', 'marketing', 'other')),
  amount_kes numeric(12, 2) not null check (amount_kes >= 0),
  note text check (length(note) <= 200),
  updated_by uuid references public.accounts (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (month, category)
);
alter table public.admin_costs enable row level security;
drop policy if exists admin_costs_admin on public.admin_costs;
create policy admin_costs_admin on public.admin_costs
  for select using (public.account_role((select auth.uid())) = 'admin');
grant select on table public.admin_costs to authenticated;

create or replace function public.set_admin_cost(p_month date, p_category text, p_amount numeric, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.account_role((select auth.uid())) is distinct from 'admin' then raise exception 'forbidden'; end if;
  if p_amount is null or p_amount < 0 then raise exception 'invalid'; end if;
  insert into public.admin_costs (month, category, amount_kes, note, updated_by)
  values (date_trunc('month', p_month)::date, p_category, p_amount, nullif(trim(coalesce(p_note, '')), ''), (select auth.uid()))
  on conflict (month, category) do update
  set amount_kes = excluded.amount_kes, note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
end;
$$;

create or replace function public.staff_economics(p_month date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_start date := date_trunc('month', coalesce(p_month, (now() at time zone 'Africa/Nairobi')::date))::date;
  v_end date := (v_start + interval '1 month')::date;
  v_revenue jsonb;
  v_costs jsonb;
  v_costs_total numeric;
  v_payers integer;
  v_payers_kes integer;
  v_net_kes numeric;
  v_active integer;
begin
  if public.account_role((select auth.uid())) is distinct from 'admin' then raise exception 'forbidden'; end if;

  with paid as (
    select t.id, t.account_id, t.country_code, t.currency, t.amount
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where t.status = 'completed' and t.provider <> 'sandbox' and not a.is_test
      and t.settled_at >= (v_start::timestamp at time zone 'Africa/Nairobi')
      and t.settled_at < (v_end::timestamp at time zone 'Africa/Nairobi')
  ), fees as (
    select l.transaction_id, sum(l.amount_kes) as fee
    from public.ledger_entries l
    where l.type = 'fee' and l.transaction_id in (select id from paid)
    group by l.transaction_id
  ), by_market as (
    select p.country_code, p.currency, sum(p.amount) as gross, coalesce(sum(f.fee), 0) as fees,
           count(*) as payments, count(distinct p.account_id) as payers
    from paid p left join fees f on f.transaction_id = p.id
    group by p.country_code, p.currency
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'country', country_code, 'currency', currency, 'gross', gross, 'fees', fees, 'net', gross - fees,
           'payments', payments, 'payers', payers) order by gross desc), '[]'::jsonb),
         (select count(distinct account_id) from paid),
         (select count(distinct account_id) from paid where currency = 'KES'),
         coalesce((select sum(gross - fees) from by_market where currency = 'KES'), 0)
  into v_revenue, v_payers, v_payers_kes, v_net_kes
  from by_market;

  select coalesce(jsonb_agg(jsonb_build_object('category', category, 'amountKes', amount_kes, 'note', note) order by category), '[]'::jsonb),
         coalesce(sum(amount_kes), 0)
  into v_costs, v_costs_total
  from public.admin_costs where month = v_start;

  select count(*) into v_active
  from public.accounts a
  where not a.is_test and not a.is_banned and a.deleted_at is null and a.last_seen_at > now() - interval '30 days';

  return jsonb_build_object(
    'month', v_start,
    'revenue', v_revenue,
    'payingMembers', v_payers,
    'payingMembersKes', v_payers_kes,
    'netKes', v_net_kes,
    'activeMembers', v_active,
    'costs', v_costs,
    'costsKes', v_costs_total,
    'feesRecorded', exists (select 1 from public.ledger_entries where type = 'fee')
  );
end;
$$;

revoke all on function public.set_admin_cost(date, text, numeric, text) from public, anon;
grant execute on function public.set_admin_cost(date, text, numeric, text) to authenticated;
revoke all on function public.staff_economics(date) from public, anon;
grant execute on function public.staff_economics(date) to authenticated;
