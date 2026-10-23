-- K3a: date plan + check-in. Free for everyone.
--
-- Before a date the member saves where and when, a trusted contact and a check-in time. At the
-- check-in time they get a push ("Are you OK?"). If they still haven't tapped "I'm safe" after a
-- short grace period, an alert with the plan goes to their contact through the safety outbox,
-- which the app delivers (emergency webhook today; SMS once the owner picks a provider, K4).
-- The contact's number is kept only on the plan and wiped 7 days after it closes.
--
-- pg_cron runs the check every minute (Vercel Hobby crons only run daily).

create extension if not exists pg_cron;

insert into private.settings (key, value) values
  ('checkin_grace_minutes', '15'),
  ('date_plans_daily_max', '5')
on conflict (key) do nothing;

create table if not exists public.date_plans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  place text not null check (length(place) between 2 and 120),
  starts_at timestamptz not null,
  check_in_at timestamptz not null,
  contact_name text check (length(contact_name) between 1 and 40),
  contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null default 'active' check (status in ('active', 'safe', 'missed', 'cancelled')),
  reminded_at timestamptz,
  alerted_at timestamptz,
  closed_at timestamptz,
  extended integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists date_plans_due_idx on public.date_plans (check_in_at) where status = 'active';
create index if not exists date_plans_account_idx on public.date_plans (account_id, created_at desc);
create unique index if not exists date_plans_one_active on public.date_plans (account_id) where status = 'active';

alter table public.date_plans enable row level security;
drop policy if exists date_plans_own on public.date_plans;
create policy date_plans_own on public.date_plans
  for select using (account_id = (select auth.uid()));
grant select on table public.date_plans to authenticated;

-- What the app must deliver outside Kutana. No message text, only what the contact needs.
create table if not exists public.safety_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('missed_checkin', 'all_clear')),
  plan_id uuid references public.date_plans (id) on delete cascade,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
create index if not exists safety_outbox_pending_idx on public.safety_outbox (created_at) where delivered_at is null;
alter table public.safety_outbox enable row level security;
-- No member policies: only the service role (the app's outbox route) reads it.

create or replace function public.start_date_plan(
  p_place text, p_starts_at timestamptz, p_check_in_at timestamptz, p_contact_name text, p_contact_phone text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  perform private.assert_active(v_uid);
  if p_place is null or length(trim(p_place)) not between 2 and 120 then raise exception 'invalid_place'; end if;
  if private.looks_like_paid_service(p_place) then raise exception 'invalid_place'; end if;
  if p_starts_at is null or p_starts_at < now() - interval '2 hours' or p_starts_at > now() + interval '7 days' then
    raise exception 'invalid_time';
  end if;
  if p_check_in_at is null or p_check_in_at < now() + interval '10 minutes' or p_check_in_at > p_starts_at + interval '24 hours'
     or p_check_in_at < p_starts_at then
    raise exception 'invalid_checkin';
  end if;
  if p_contact_phone is null or p_contact_phone !~ '^\+[1-9][0-9]{7,14}$'
     or p_contact_name is null or length(trim(p_contact_name)) not between 1 and 40 then
    raise exception 'invalid_contact';
  end if;
  if exists (select 1 from public.date_plans where account_id = v_uid and status = 'active') then
    raise exception 'plan_active';
  end if;
  if (select count(*) from public.date_plans where account_id = v_uid and created_at > now() - interval '1 day')
     >= private.setting_int('date_plans_daily_max', 5) then
    raise exception 'rate_limited';
  end if;
  insert into public.date_plans (account_id, place, starts_at, check_in_at, contact_name, contact_phone)
  values (v_uid, trim(p_place), p_starts_at, p_check_in_at, trim(p_contact_name), p_contact_phone)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end;
$$;

-- "I'm safe" closes the plan. After a missed check-in it also tells the contact all is well.
create or replace function public.date_plan_safe(p_plan uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_was text;
begin
  select status into v_was from public.date_plans
  where id = p_plan and account_id = (select auth.uid()) and status in ('active', 'missed')
  for update;
  if v_was is null then raise exception 'not_found'; end if;
  update public.date_plans set status = 'safe', closed_at = now() where id = p_plan;
  if v_was = 'missed' then
    insert into public.safety_outbox (kind, plan_id) values ('all_clear', p_plan);
  end if;
  return jsonb_build_object('ok', true, 'allClearSent', v_was = 'missed');
end;
$$;

create or replace function public.date_plan_cancel(p_plan uuid)
returns void language sql security definer set search_path = public as $$
  update public.date_plans set status = 'cancelled', closed_at = now()
  where id = p_plan and account_id = (select auth.uid()) and status = 'active';
$$;

-- "Need more time": push the check-in back 30 minutes, up to 4 times.
create or replace function public.date_plan_extend(p_plan uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_at timestamptz;
begin
  update public.date_plans
  set check_in_at = greatest(check_in_at, now()) + interval '30 minutes', reminded_at = null, extended = extended + 1
  where id = p_plan and account_id = (select auth.uid()) and status = 'active' and extended < 4
  returning check_in_at into v_at;
  if v_at is null then raise exception 'not_allowed'; end if;
  return jsonb_build_object('checkInAt', v_at);
end;
$$;

-- Every minute: remind at the check-in time, alert the contact after the grace period, and
-- forget contact numbers a week after a plan closes.
create or replace function public.run_date_checkins()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_plan record;
  v_alerts integer := 0;
  v_url text := replace(coalesce((select value from private.settings where key = 'push_url'), ''), '/api/push/dispatch', '/api/safety/outbox');
  v_secret text := (select value from private.settings where key = 'push_secret');
begin
  for v_plan in
    select id, account_id from public.date_plans
    where status = 'active' and reminded_at is null and check_in_at <= now()
    for update skip locked
  loop
    update public.date_plans set reminded_at = now() where id = v_plan.id;
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_plan.account_id, 'system', 'Time to check in', 'Tap “I’m safe” so we don’t alert your contact.', '/safety/date');
  end loop;

  for v_plan in
    select id from public.date_plans
    where status = 'active'
      and check_in_at + make_interval(mins => private.setting_int('checkin_grace_minutes', 15)) <= now()
    for update skip locked
  loop
    update public.date_plans set status = 'missed', alerted_at = now() where id = v_plan.id;
    insert into public.safety_outbox (kind, plan_id) values ('missed_checkin', v_plan.id);
    v_alerts := v_alerts + 1;
  end loop;

  if v_alerts > 0 and v_url like 'http%' and v_secret is not null then
    begin
      perform net.http_post(
        url := v_url,
        body := '{}'::jsonb,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret)
      );
    exception when others then
      null; -- The outbox keeps the alert; the app retries on its next call.
    end;
  end if;

  update public.date_plans set contact_phone = null, contact_name = null
  where status <> 'active' and closed_at < now() - interval '7 days' and contact_phone is not null;
  return v_alerts;
end;
$$;

-- For the outbox route (service role): what to send for an alert. The member's first name only.
create or replace function public.safety_outbox_due(p_limit integer default 20)
returns table (id uuid, kind text, contact_name text, contact_phone text, member_name text, place text, starts_at timestamptz, check_in_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.kind, d.contact_name, d.contact_phone,
         split_part(btrim(coalesce(p.display_name, 'Your friend')), ' ', 1), d.place, d.starts_at, d.check_in_at
  from public.safety_outbox o
  join public.date_plans d on d.id = o.plan_id
  left join public.profiles p on p.account_id = d.account_id
  where o.delivered_at is null and o.attempts < 5 and d.contact_phone is not null
  order by o.created_at
  limit greatest(p_limit, 0);
$$;

create or replace function public.safety_outbox_mark(p_id uuid, p_ok boolean, p_error text default null)
returns void language sql security definer set search_path = public as $$
  update public.safety_outbox
  set delivered_at = case when p_ok then now() else delivered_at end,
      attempts = attempts + 1,
      last_error = case when p_ok then null else left(p_error, 200) end
  where id = p_id;
$$;

revoke all on function public.start_date_plan(text, timestamptz, timestamptz, text, text) from public, anon;
grant execute on function public.start_date_plan(text, timestamptz, timestamptz, text, text) to authenticated;
revoke all on function public.date_plan_safe(uuid) from public, anon;
grant execute on function public.date_plan_safe(uuid) to authenticated;
revoke all on function public.date_plan_cancel(uuid) from public, anon;
grant execute on function public.date_plan_cancel(uuid) to authenticated;
revoke all on function public.date_plan_extend(uuid) from public, anon;
grant execute on function public.date_plan_extend(uuid) to authenticated;
revoke all on function public.run_date_checkins() from public, anon, authenticated;
revoke all on function public.safety_outbox_due(integer) from public, anon, authenticated;
grant execute on function public.safety_outbox_due(integer) to service_role;
revoke all on function public.safety_outbox_mark(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.safety_outbox_mark(uuid, boolean, text) to service_role;

select cron.schedule('kutana-date-checkins', '* * * * *', 'select public.run_date_checkins()');
