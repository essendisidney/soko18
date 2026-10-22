-- Payment hardening, from a review before real money flows.
--
-- 1. Test-mode ("sandbox") payments are off unless someone turns them on, and members can only
--    start a sandbox row while it's on. 00010 seeded it 'on', so a fresh database used to let
--    any member settle free sandbox rows. (Production was already switched off by hand.)
-- 2. Members can't pre-fill columns that settlement writes (provider_reference, result_desc,
--    phone) and amount_kes must match the price. Stops junk rows that block a real settlement.
-- 3. The M-Pesa (Daraja) settle/fail functions only touch M-Pesa rows, so a Daraja callback can
--    never complete an IntaSend payment that shares the checkout_request_id column.

update private.settings set value = 'off' where key = 'payments_sandbox';

-- Members can't read private.settings, so the insert policy asks through this instead.
create or replace function public.payments_sandbox_on()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value from private.settings where key = 'payments_sandbox'), 'off') = 'on';
$$;
grant execute on function public.payments_sandbox_on() to authenticated;

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated
  with check (
    account_id = (select auth.uid())
    and status = 'pending'
    and (
      provider in ('mpesa', 'paystack', 'intasend')
      or (provider = 'sandbox' and public.payments_sandbox_on())
    )
    and provider_ref like transactions.provider || ':%'
    and checkout_request_id is null
    and mpesa_receipt is null
    and settled_at is null
    and provider_reference is null
    and result_desc is null
    and phone is null
    and amount_kes = round(transactions.amount)::integer
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

create or replace function public.settle_mpesa_checkout(p_checkout text, p_receipt text, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
begin
  select * into v_tx from public.transactions where checkout_request_id = p_checkout and provider = 'mpesa';
  if not found then raise exception 'not_found'; end if;
  if v_tx.currency <> 'KES' or coalesce(v_tx.amount, v_tx.amount_kes) <> p_amount then
    update public.transactions set status = 'failed', result_desc = 'amount_mismatch' where id = v_tx.id and status = 'pending';
    raise exception 'invalid';
  end if;
  return private.settle_transaction(v_tx.id, p_receipt);
end;
$$;

create or replace function public.fail_mpesa_checkout(p_checkout text, p_desc text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.transactions
  set status = 'failed', result_desc = left(p_desc, 200)
  where checkout_request_id = p_checkout and provider = 'mpesa' and status = 'pending';
$$;

revoke all on function public.settle_mpesa_checkout(text, text, integer) from public, anon, authenticated;
revoke all on function public.fail_mpesa_checkout(text, text) from public, anon, authenticated;
grant execute on function public.settle_mpesa_checkout(text, text, integer) to service_role;
grant execute on function public.fail_mpesa_checkout(text, text) to service_role;

-- When the STK push itself fails, close the row instead of leaving it pending forever.
create or replace function public.fail_mpesa_checkout_tx(p_tx uuid, p_desc text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.transactions
  set status = 'failed', result_desc = left(p_desc, 200)
  where id = p_tx and provider = 'mpesa' and status = 'pending' and checkout_request_id is null;
$$;

revoke all on function public.fail_mpesa_checkout_tx(uuid, text) from public, anon, authenticated;
grant execute on function public.fail_mpesa_checkout_tx(uuid, text) to service_role;
