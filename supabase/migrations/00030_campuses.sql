-- Campus launch: verified students, one campus at a time.
--
-- How it works
--   * A member proves they study at a campus with their university email: either they signed in
--     with it (confirmed by Supabase), or we email a 6-digit code to it.
--   * One student email can verify one account. We keep a peppered SHA-256 of it, never the address.
--   * Each campus opens when `unlock_target` verified students have joined. Counts are real;
--     staff can open or close a campus by hand:  update public.campuses set status = 'live' where slug = 'uon';
--   * Verified students get a campus badge on their card (they can hide it) and, once their campus
--     is open, a campus deck on Discover.
--   * Campus never skips the 18+ check: only accounts with a server-checked date of birth can verify.
--   * Email domains match the domain and any subdomain. Where a university gives students their own
--     subdomain (students.uonbi.ac.ke, student.egerton.ac.ke) we list that, so staff addresses don't count.
--     Strathmore, USIU, MMU, Daystar and DeKUT still use the main domain: confirm their student domain
--     before marketing there.

insert into private.settings (key, value) values
  ('campus_email_pepper', encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text, 'UTF8')), 'hex')),
  ('campus_code_minutes', '15'),
  ('campus_code_daily_sends', '5')
on conflict (key) do nothing;

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  short_name text not null,
  town text not null,
  email_domains text[] not null default '{}',
  status text not null default 'waitlist' check (status in ('waitlist', 'live', 'closed')),
  unlock_target integer not null default 300 check (unlock_target > 0),
  opened_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.campuses enable row level security;

drop policy if exists campuses_read on public.campuses;
create policy campuses_read on public.campuses
  for select using (status <> 'closed' or public.is_staff());

grant select on table public.campuses to anon, authenticated;

create table if not exists public.campus_members (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  campus_id uuid not null references public.campuses (id) on delete cascade,
  email_hash text not null unique,
  method text not null check (method in ('login_email', 'email_code')),
  show_on_profile boolean not null default true,
  verified_at timestamptz not null default now()
);

create index if not exists campus_members_campus_idx on public.campus_members (campus_id);

alter table public.campus_members enable row level security;

drop policy if exists campus_members_own on public.campus_members;
create policy campus_members_own on public.campus_members
  for select using (account_id = (select auth.uid()) or public.is_staff());

drop policy if exists campus_members_update_own on public.campus_members;
create policy campus_members_update_own on public.campus_members
  for update using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));

drop policy if exists campus_members_delete_own on public.campus_members;
create policy campus_members_delete_own on public.campus_members
  for delete using (account_id = (select auth.uid()));

-- Members only ever change whether the badge shows. Joining goes through the functions below.
revoke all on table public.campus_members from anon, authenticated;
grant select (account_id, campus_id, method, show_on_profile, verified_at) on table public.campus_members to authenticated;
grant update (show_on_profile) on table public.campus_members to authenticated;
grant delete on table public.campus_members to authenticated;

-- Pending email codes. Server only.
create table if not exists private.campus_codes (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  campus_id uuid not null references public.campuses (id) on delete cascade,
  email_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  sends_today integer not null default 0,
  sends_day date not null default current_date,
  last_sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.campus_hash(p_value text)
returns text language sql stable security definer set search_path = public as $$
  select encode(sha256(convert_to(
    lower(btrim(p_value)) || ':' || coalesce((select value from private.settings where key = 'campus_email_pepper'), ''),
    'UTF8')), 'hex');
$$;

create or replace function private.campus_for_email(p_email text)
returns public.campuses language sql stable security definer set search_path = public as $$
  select c.* from public.campuses c, unnest(c.email_domains) d
  where c.status <> 'closed'
    and lower(btrim(p_email)) ~ '^[^@[:space:]]+@[a-z0-9.-]+\.[a-z]{2,}$'
    and (split_part(lower(btrim(p_email)), '@', 2) = lower(d)
         or split_part(lower(btrim(p_email)), '@', 2) like '%.' || lower(d))
  order by length(d) desc
  limit 1;
$$;

-- Adults with a live account only. Returns null when fine, else the reason.
create or replace function private.campus_blocker(p_account uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when a.id is null or a.is_banned or a.deleted_at is not null then 'unauthorized'
    when a.date_of_birth is null or a.date_of_birth > (current_date - interval '18 years')::date then 'adult_only'
    when exists (select 1 from public.campus_members m where m.account_id = p_account) then 'already'
  end
  from (select 1) one left join public.accounts a on a.id = p_account;
$$;

create or replace function private.join_campus(p_account uuid, p_campus uuid, p_email_hash text, p_method text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_campus public.campuses;
begin
  if exists (select 1 from public.campus_members where email_hash = p_email_hash and account_id <> p_account) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;
  insert into public.campus_members (account_id, campus_id, email_hash, method)
  values (p_account, p_campus, p_email_hash, p_method)
  on conflict do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;
  -- Read after the insert: this student may have just opened the campus (they get that notice instead).
  select * into v_campus from public.campuses where id = p_campus;
  if v_campus.status <> 'live' then
    insert into public.notifications (account_id, kind, title, body, href)
    values (p_account, 'system', 'Verified at ' || v_campus.short_name,
            'You’re in. Invite your campus to open it faster.', '/campus');
  end if;
  return jsonb_build_object('ok', true, 'campus', v_campus.slug, 'name', v_campus.short_name);
end;
$$;

-- ---------------------------------------------------------------------------
-- Verify with the email you signed in with
-- ---------------------------------------------------------------------------

create or replace function public.claim_campus_from_login()
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_campus public.campuses;
  v_blocker text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;
  v_blocker := private.campus_blocker(v_uid);
  if v_blocker is not null then
    return jsonb_build_object('ok', false, 'reason', v_blocker);
  end if;
  select email into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'not_campus');
  end if;
  v_campus := private.campus_for_email(v_email);
  if v_campus.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_campus');
  end if;
  return private.join_campus(v_uid, v_campus.id, private.campus_hash(v_email), 'login_email');
end;
$$;

-- ---------------------------------------------------------------------------
-- Verify with a code sent to a student email (server sends the email)
-- ---------------------------------------------------------------------------

-- Service role only: the API route generates the code, stores it here and emails it.
create or replace function public.start_campus_code(p_account uuid, p_email text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_campus public.campuses;
  v_blocker text;
  v_hash text;
  v_row private.campus_codes;
begin
  if p_code !~ '^[0-9]{6}$' then
    raise exception 'bad_code';
  end if;
  v_blocker := private.campus_blocker(p_account);
  if v_blocker is not null then
    return jsonb_build_object('ok', false, 'reason', v_blocker);
  end if;
  v_campus := private.campus_for_email(p_email);
  if v_campus.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_campus');
  end if;
  v_hash := private.campus_hash(p_email);
  if exists (select 1 from public.campus_members where email_hash = v_hash) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  select * into v_row from private.campus_codes where account_id = p_account for update;
  if found then
    if v_row.last_sent_at > now() - interval '60 seconds' then
      return jsonb_build_object('ok', false, 'reason', 'wait');
    end if;
    if v_row.sends_day = current_date
       and v_row.sends_today >= private.setting_int('campus_code_daily_sends', 5) then
      return jsonb_build_object('ok', false, 'reason', 'limit');
    end if;
  end if;

  insert into private.campus_codes (account_id, campus_id, email_hash, code_hash, expires_at, attempts, sends_today, sends_day, last_sent_at)
  values (p_account, v_campus.id, v_hash, private.campus_hash(p_code),
          now() + make_interval(mins => private.setting_int('campus_code_minutes', 15)), 0, 1, current_date, now())
  on conflict (account_id) do update set
    campus_id = excluded.campus_id,
    email_hash = excluded.email_hash,
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    attempts = 0,
    sends_today = case when private.campus_codes.sends_day = current_date then private.campus_codes.sends_today + 1 else 1 end,
    sends_day = current_date,
    last_sent_at = now();

  return jsonb_build_object('ok', true, 'campus', v_campus.slug, 'name', v_campus.short_name);
end;
$$;

create or replace function public.confirm_campus_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := (select auth.uid());
  v_row private.campus_codes;
  v_blocker text;
  v_result jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthorized');
  end if;
  v_blocker := private.campus_blocker(v_uid);
  if v_blocker is not null then
    return jsonb_build_object('ok', false, 'reason', v_blocker);
  end if;
  select * into v_row from private.campus_codes where account_id = v_uid for update;
  if not found or v_row.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if v_row.attempts >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;
  if private.campus_hash(coalesce(p_code, '')) <> v_row.code_hash then
    update private.campus_codes set attempts = attempts + 1 where account_id = v_uid;
    return jsonb_build_object('ok', false, 'reason', 'wrong');
  end if;
  v_result := private.join_campus(v_uid, v_row.campus_id, v_row.email_hash, 'email_code');
  -- A used code can never work again.
  update private.campus_codes set code_hash = '', expires_at = now() - interval '1 second' where account_id = v_uid;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Opening a campus
-- ---------------------------------------------------------------------------

create or replace function private.campus_maybe_open()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_campus public.campuses;
begin
  select * into v_campus from public.campuses where id = new.campus_id for update;
  if v_campus.status <> 'waitlist' then return new; end if;
  if (select count(*) from public.campus_members where campus_id = new.campus_id) < v_campus.unlock_target then
    return new;
  end if;
  update public.campuses set status = 'live', opened_at = now() where id = v_campus.id;
  insert into public.notifications (account_id, kind, title, body, href)
  select m.account_id, 'system', v_campus.short_name || ' is open 🎉', 'Your campus deck is live. Go say hi.', '/discover?campus=' || v_campus.slug
  from public.campus_members m where m.campus_id = v_campus.id;
  return new;
end;
$$;

drop trigger if exists campus_members_open on public.campus_members;
create trigger campus_members_open
after insert on public.campus_members
for each row execute function private.campus_maybe_open();

-- Staff opening a campus by hand also stamps the date.
create or replace function private.campus_stamp_open()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'live' and old.status is distinct from 'live' and new.opened_at is null then
    new.opened_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists campuses_stamp_open on public.campuses;
create trigger campuses_stamp_open
before update on public.campuses
for each row execute function private.campus_stamp_open();

-- ---------------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------------

-- Campus vs campus: real verified-student counts, never invented.
create or replace function public.campus_board()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(b.item order by (b.item->>'status') = 'live' desc, (b.item->>'joined')::int desc, b.item->>'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'slug', c.slug,
      'name', c.name,
      'shortName', c.short_name,
      'town', c.town,
      'status', c.status,
      'joined', (select count(*) from public.campus_members m where m.campus_id = c.id),
      'target', c.unlock_target,
      'openedAt', c.opened_at,
      'daysToOpen', case when c.opened_at is not null
        then greatest(0, (c.opened_at::date - c.created_at::date)) end
    ) as item
    from public.campuses c
    where c.status <> 'closed'
  ) b;
$$;

create or replace function public.my_campus()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'slug', c.slug,
    'name', c.name,
    'shortName', c.short_name,
    'status', c.status,
    'joined', (select count(*) from public.campus_members x where x.campus_id = c.id),
    'target', c.unlock_target,
    'showOnProfile', m.show_on_profile,
    'method', m.method,
    'verifiedAt', m.verified_at
  )
  from public.campus_members m join public.campuses c on c.id = m.campus_id
  where m.account_id = (select auth.uid());
$$;

-- Cards carry the campus badge when the member shows it.
create or replace view public.live_profile_cards as
 select p.id,
    p.slug,
    p.display_name,
    p.birth_year,
    p.gender,
    p.looking_for,
    p.is_verified,
    p.status,
    p.boost_until,
    p.bio,
    p.prompts,
    c.slug as city_slug,
    c.name as city_name,
    a.slug as area_slug,
    a.name as area_name,
    m.storage_path as cover_path,
    coalesce(acc.is_test, false) as is_test,
    cam.slug as campus_slug,
    cam.short_name as campus_name
   from profiles p
     join locations c on c.id = p.city_id
     left join locations a on a.id = p.area_id
     left join profile_media m on m.profile_id = p.id and m.is_cover = true and m.status = 'approved'::media_status
     left join accounts acc on acc.id = p.account_id
     left join campus_members cm on cm.account_id = p.account_id and cm.show_on_profile
     left join campuses cam on cam.id = cm.campus_id and cam.status <> 'closed'
  where p.status = 'live'::profile_status and p.flagged_reason is null and not profile_hidden_from_me(p.account_id);

-- ---------------------------------------------------------------------------
-- Campuses. Waitlist until enough students verify.
-- ---------------------------------------------------------------------------

insert into public.campuses (slug, name, short_name, town, email_domains, unlock_target, sort_order) values
  ('uon', 'University of Nairobi', 'UoN', 'Nairobi', array['students.uonbi.ac.ke'], 300, 0),
  ('ku', 'Kenyatta University', 'KU', 'Nairobi', array['students.ku.ac.ke'], 300, 1),
  ('jkuat', 'Jomo Kenyatta University of Agriculture and Technology', 'JKUAT', 'Juja', array['students.jkuat.ac.ke'], 300, 2),
  ('strathmore', 'Strathmore University', 'Strathmore', 'Nairobi', array['strathmore.edu'], 200, 3),
  ('usiu', 'United States International University – Africa', 'USIU', 'Nairobi', array['usiu.ac.ke'], 200, 4),
  ('tuk', 'Technical University of Kenya', 'TUK', 'Nairobi', array['students.tukenya.ac.ke'], 200, 5),
  ('mmu', 'Multimedia University of Kenya', 'MMU', 'Nairobi', array['mmu.ac.ke'], 200, 6),
  ('daystar', 'Daystar University', 'Daystar', 'Nairobi', array['daystar.ac.ke'], 150, 7),
  ('moi', 'Moi University', 'Moi', 'Eldoret', array['students.mu.ac.ke'], 300, 8),
  ('egerton', 'Egerton University', 'Egerton', 'Njoro', array['student.egerton.ac.ke'], 300, 9),
  ('maseno', 'Maseno University', 'Maseno', 'Maseno', array['student.maseno.ac.ke'], 300, 10),
  ('dekut', 'Dedan Kimathi University of Technology', 'DeKUT', 'Nyeri', array['dkut.ac.ke'], 200, 11)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.claim_campus_from_login() from public, anon;
revoke all on function public.confirm_campus_code(text) from public, anon;
revoke all on function public.my_campus() from public, anon;
revoke all on function public.start_campus_code(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_campus_from_login() to authenticated;
grant execute on function public.confirm_campus_code(text) to authenticated;
grant execute on function public.my_campus() to authenticated;
grant execute on function public.campus_board() to anon, authenticated;
grant execute on function public.start_campus_code(uuid, text, text) to service_role;

revoke execute on all functions in schema private from public, anon, authenticated;
