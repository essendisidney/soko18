-- IntaSend as a payment provider (M-Pesa STK + hosted checkout for cards).
-- The invoice id is kept in checkout_request_id. Settlement is server-only and re-checks amount and currency.

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
  );

create or replace function public.attach_intasend_invoice(p_tx uuid, p_invoice text, p_phone text default null)
returns void language sql security definer set search_path = public as $$
  update public.transactions
  set checkout_request_id = p_invoice, phone = coalesce(p_phone, phone)
  where id = p_tx and provider = 'intasend' and status = 'pending';
$$;

create or replace function public.settle_intasend(p_tx uuid, p_invoice text, p_amount numeric, p_currency text, p_receipt text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tx public.transactions%rowtype;
begin
  select * into v_tx from public.transactions where id = p_tx;
  if not found or v_tx.provider <> 'intasend' then raise exception 'not_found'; end if;
  if v_tx.status = 'completed' then
    return jsonb_build_object('transactionId', v_tx.id, 'already', true);
  end if;
  if v_tx.currency <> upper(p_currency) or coalesce(v_tx.amount, v_tx.amount_kes) <> p_amount then
    update public.transactions set status = 'failed', result_desc = 'amount_mismatch' where id = v_tx.id and status = 'pending';
    raise exception 'invalid';
  end if;
  update public.transactions set checkout_request_id = coalesce(checkout_request_id, p_invoice) where id = v_tx.id;
  return private.settle_transaction(v_tx.id, coalesce(nullif(p_receipt, ''), 'intasend:' || p_invoice));
end;
$$;

create or replace function public.fail_intasend(p_tx uuid, p_desc text)
returns void language sql security definer set search_path = public as $$
  update public.transactions set status = 'failed', result_desc = left(coalesce(p_desc, 'failed'), 200)
  where id = p_tx and provider = 'intasend' and status = 'pending';
$$;

revoke all on function public.attach_intasend_invoice(uuid, text, text) from public, anon, authenticated;
revoke all on function public.settle_intasend(uuid, text, numeric, text, text) from public, anon, authenticated;
revoke all on function public.fail_intasend(uuid, text) from public, anon, authenticated;
grant execute on function public.attach_intasend_invoice(uuid, text, text) to service_role;
grant execute on function public.settle_intasend(uuid, text, numeric, text, text) to service_role;
grant execute on function public.fail_intasend(uuid, text) to service_role;

update public.markets set payment_providers = array_append(payment_providers, 'intasend')
where country_code = 'KE' and not ('intasend' = any(payment_providers));
