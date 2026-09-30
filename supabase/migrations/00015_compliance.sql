-- Compliance: consent records (Kenya Data Protection Act 2019 / GDPR-style),
-- server-side date of birth, and a 30-day purge queue for deleted accounts.

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind text not null check (kind in ('terms', 'privacy', 'sensitive_data', 'marketing')),
  version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists consents_account_idx on public.consents (account_id, kind, created_at desc);

alter table public.consents enable row level security;

drop policy if exists consents_own on public.consents;
create policy consents_own on public.consents
  for select using (account_id = (select auth.uid()) or public.is_staff());

grant select on table public.consents to authenticated;

-- Latest decision per kind.
create or replace function public.my_consents()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'dateOfBirth', (select date_of_birth from public.accounts where id = (select auth.uid())),
    'consents', coalesce((
      select jsonb_object_agg(kind, jsonb_build_object('granted', granted, 'version', version, 'at', created_at))
      from (
        select distinct on (kind) kind, granted, version, created_at
        from public.consents
        where account_id = (select auth.uid())
        order by kind, created_at desc
      ) latest
    ), '{}'::jsonb)
  );
$$;

-- One call at sign-up (or first sign-in): date of birth + terms/privacy + sensitive data, marketing optional.
create or replace function public.record_consents(
  p_version text,
  p_date_of_birth date,
  p_sensitive boolean,
  p_marketing boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if p_date_of_birth is null or p_date_of_birth > (current_date - interval '18 years')::date then
    -- Under-18 sign-ups are closed immediately.
    update public.accounts set is_banned = true where id = v_uid;
    update public.profiles set status = 'suspended' where account_id = v_uid;
    raise exception 'underage';
  end if;
  if p_date_of_birth < date '1920-01-01' then
    raise exception 'invalid_dob';
  end if;

  update public.accounts
  set date_of_birth = coalesce(date_of_birth, p_date_of_birth),
      age_confirmed_at = coalesce(age_confirmed_at, now())
  where id = v_uid;

  insert into public.consents (account_id, kind, version, granted) values
    (v_uid, 'terms', p_version, true),
    (v_uid, 'privacy', p_version, true),
    (v_uid, 'sensitive_data', p_version, coalesce(p_sensitive, false)),
    (v_uid, 'marketing', p_version, coalesce(p_marketing, false));

  return public.my_consents();
end;
$$;

-- Change a single optional consent later (marketing, or withdrawing sensitive data).
create or replace function public.set_consent(p_kind text, p_granted boolean, p_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if p_kind not in ('sensitive_data', 'marketing') then
    raise exception 'invalid';
  end if;
  insert into public.consents (account_id, kind, version, granted) values (v_uid, p_kind, p_version, p_granted);
  -- Withdrawing sensitive-data consent clears what we hold under it.
  if p_kind = 'sensitive_data' and not p_granted then
    update public.accounts set gender = null, show_me = array['man', 'woman', 'nonbinary'] where id = v_uid;
  end if;
  return public.my_consents();
end;
$$;

revoke all on function public.my_consents() from public, anon;
revoke all on function public.record_consents(text, date, boolean, boolean) from public, anon;
revoke all on function public.set_consent(text, boolean, text) from public, anon;
grant execute on function public.my_consents() to authenticated;
grant execute on function public.record_consents(text, date, boolean, boolean) to authenticated;
grant execute on function public.set_consent(text, boolean, text) to authenticated;

-- A profile can only be created after the member confirmed age and accepted the terms.
create or replace function private.profile_requires_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or public.is_staff() then
    return new;
  end if;
  if not exists (
    select 1 from public.accounts
    where id = new.account_id and age_confirmed_at is not null and is_banned = false
  ) then
    raise exception 'consent_required';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_require_consent on public.profiles;
create trigger profiles_require_consent
before insert on public.profiles
for each row execute function private.profile_requires_consent();

-- Accounts deleted more than 30 days ago, for the purge job (server, service role only).
create or replace function public.accounts_due_for_purge(p_limit integer default 50)
returns table (account_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select id from public.accounts
  where deleted_at is not null and deleted_at < now() - interval '30 days'
  order by deleted_at
  limit greatest(1, least(p_limit, 200));
$$;

revoke all on function public.accounts_due_for_purge(integer) from public, anon, authenticated;
grant execute on function public.accounts_due_for_purge(integer) to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
