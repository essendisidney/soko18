-- Payment rails: owner may open a pending transaction. Settlement is definer-only.
-- Featured / boost / spotlight timestamps require a matching ledger row.

create policy transactions_insert_own on public.transactions
  for insert
  to authenticated
  with check (
    account_id = (select auth.uid())
    and status = 'pending'
    and amount_kes > 0
    and purpose in ('boost', 'spotlight', 'featured')
  );

grant insert, select on table public.transactions to authenticated;
grant select on table public.ledger_entries to authenticated;

create or replace function private.promotion_has_ledger(
  p_account uuid,
  p_profile uuid,
  p_kind public.ledger_type
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ledger_entries le
    where le.account_id = p_account
      and le.type in (p_kind, 'adjustment')
      and le.amount_kes > 0
      and (
        le.metadata->>'profile_id' = p_profile::text
        or le.metadata->>'profileId' = p_profile::text
      )
  );
$$;

create or replace function private.paid_flags_require_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.featured_until is not null
     and (tg_op = 'INSERT' or new.featured_until is distinct from old.featured_until)
     and new.featured_until > now()
     and not private.promotion_has_ledger(new.account_id, new.id, 'featured')
  then
    raise exception 'featured cannot exist without ledger';
  end if;

  if new.boost_until is not null
     and (tg_op = 'INSERT' or new.boost_until is distinct from old.boost_until)
     and new.boost_until > now()
     and not private.promotion_has_ledger(new.account_id, new.id, 'boost')
  then
    raise exception 'boost cannot exist without ledger';
  end if;

  if new.spotlight_until is not null
     and (tg_op = 'INSERT' or new.spotlight_until is distinct from old.spotlight_until)
     and new.spotlight_until > now()
     and not private.promotion_has_ledger(new.account_id, new.id, 'spotlight')
  then
    raise exception 'spotlight cannot exist without ledger';
  end if;

  return new;
end;
$$;

create trigger profiles_paid_flags_ledger
before insert or update of featured_until, boost_until, spotlight_until on public.profiles
for each row execute function private.paid_flags_require_ledger();

create or replace function private.settle_paid_promotion(p_tx uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions%rowtype;
  v_profile uuid;
  v_until timestamptz;
  v_hours int;
  v_expected int;
begin
  select * into v_tx from public.transactions where id = p_tx;
  if not found then
    raise exception 'not_found';
  end if;
  if v_tx.account_id is distinct from (select auth.uid()) then
    raise exception 'forbidden';
  end if;
  if v_tx.provider is distinct from 'sandbox' then
    raise exception 'forbidden';
  end if;
  if v_tx.status is distinct from 'pending' then
    raise exception 'forbidden';
  end if;
  if v_tx.purpose not in ('boost', 'spotlight', 'featured') then
    raise exception 'invalid';
  end if;

  v_expected := case v_tx.purpose
    when 'boost' then 500
    when 'spotlight' then 1200
    when 'featured' then 3500
    else -1
  end;
  if v_tx.amount_kes is distinct from v_expected then
    raise exception 'invalid';
  end if;

  select id into v_profile from public.profiles where account_id = v_tx.account_id;
  if v_profile is null then
    raise exception 'not_found';
  end if;

  v_hours := case v_tx.purpose
    when 'boost' then 24
    when 'spotlight' then 4
    when 'featured' then 168
    else 0
  end;
  v_until := now() + make_interval(hours => v_hours);

  update public.transactions
  set status = 'completed'
  where id = v_tx.id;

  insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
  values (
    v_tx.account_id,
    v_tx.id,
    'payment',
    v_tx.amount_kes,
    'debit',
    jsonb_build_object('profile_id', v_profile, 'kind', v_tx.purpose)
  );

  insert into public.ledger_entries (account_id, transaction_id, type, amount_kes, direction, metadata)
  values (
    v_tx.account_id,
    v_tx.id,
    v_tx.purpose,
    v_tx.amount_kes,
    'credit',
    jsonb_build_object('profile_id', v_profile, 'kind', v_tx.purpose, 'until', v_until)
  );

  insert into public.promotions (profile_id, kind, transaction_id, starts_at, ends_at)
  values (v_profile, v_tx.purpose::text, v_tx.id, now(), v_until);

  if v_tx.purpose = 'boost' then
    insert into public.boosts (profile_id, transaction_id, starts_at, ends_at)
    values (v_profile, v_tx.id, now(), v_until);
    update public.profiles set boost_until = v_until where id = v_profile;
  elsif v_tx.purpose = 'spotlight' then
    update public.profiles set spotlight_until = v_until where id = v_profile;
  elsif v_tx.purpose = 'featured' then
    update public.profiles set featured_until = v_until where id = v_profile;
  end if;

  return jsonb_build_object(
    'transactionId', v_tx.id,
    'kind', v_tx.purpose,
    'until', v_until,
    'ledgerPosted', true
  );
end;
$$;

revoke all on function private.promotion_has_ledger(uuid, uuid, public.ledger_type) from public, anon, authenticated;
revoke all on function private.paid_flags_require_ledger() from public, anon, authenticated;
revoke all on function private.settle_paid_promotion(uuid) from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

-- Definer wrapper is the PostgREST surface. Work stays in private; caller is still auth.uid().
create or replace function public.settle_sandbox_transaction(p_tx uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return private.settle_paid_promotion(p_tx);
end;
$$;

revoke all on function public.settle_sandbox_transaction(uuid) from public, anon;
grant execute on function public.settle_sandbox_transaction(uuid) to authenticated;
