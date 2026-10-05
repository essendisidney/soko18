-- Kutana: bring the live database up to date with main + PR #1.
-- Paste into Supabase → SQL Editor → Run. It runs as one transaction: all or nothing.
-- Live is at 00027. This applies 00028 → 00032 in order, then removes a leftover test table.

begin;

-- ========================================================================
-- 00028_live_first.sql
-- ========================================================================
-- Live first, reviewed after.
-- A profile goes live by itself as soon as it has a name, area, gender, what they're looking for
-- and at least one photo. Photos show as soon as they're uploaded. Staff check new profiles and
-- photos afterwards from the same Admin queue and can take them down. Members can never make
-- themselves live while flagged, suspended or removed.

alter table public.profiles add column if not exists checked_at timestamptz;

-- Everything already approved by a human counts as checked.
update public.profiles set checked_at = coalesce(checked_at, now()) where status = 'live';
update public.profile_media set reviewed_at = coalesce(reviewed_at, now()) where status = 'approved';

create or replace function private.profile_ready(p public.profiles)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(btrim(p.display_name), '') <> ''
     and p.area_id is not null
     and p.gender is not null
     and p.looking_for is not null
     and p.flagged_reason is null
     and exists (select 1 from public.profile_media m where m.profile_id = p.id and m.status = 'approved');
$$;

-- Owners can't touch review columns. System updates (our own triggers) pass through.
create or replace function private.guard_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff()
     or coalesce(current_setting('soko.paid_ok', true), '') = 'on'
     or coalesce(current_setting('soko.system', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.verified_at := null;
    new.published_at := null;
    new.quality_score := 0;
    new.checked_at := null;
    return new;
  end if;
  new.is_verified := old.is_verified;
  new.verified_at := old.verified_at;
  new.published_at := old.published_at;
  new.quality_score := old.quality_score;
  new.checked_at := old.checked_at;
  return new;
end;
$$;

-- The status a member's save ends in is decided here, not by the app.
create or replace function private.owner_profile_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff()
     or coalesce(current_setting('soko.system', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('suspended', 'removed') then
    new.status := old.status;
    return new;
  end if;
  if new.status = 'paused' then
    return new;
  end if;
  if new.flagged_reason is not null then
    new.status := 'pending_review';
    return new;
  end if;
  if private.profile_ready(new) then
    new.status := 'live';
    new.published_at := case when tg_op = 'UPDATE' then coalesce(old.published_at, now()) else now() end;
  else
    new.status := 'draft';
  end if;
  return new;
end;
$$;

create or replace trigger profiles_zz_owner_status
before insert or update on public.profiles
for each row execute function private.owner_profile_status();

alter policy profiles_insert_own on public.profiles
  with check (account_id = auth.uid() and status in ('draft', 'pending_review', 'live'));

alter policy profiles_update_own on public.profiles
  using (account_id = auth.uid())
  with check (account_id = auth.uid() and status in ('draft', 'pending_review', 'paused', 'live'));

-- Tell the member the first time they go live on their own.
create or replace function private.profile_went_live()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'live'
     and (tg_op = 'INSERT' or (old.status is distinct from 'live' and old.published_at is null))
     and new.checked_at is null
     and not public.is_staff() then
    insert into public.notifications (account_id, kind, title, body, href)
    values (new.account_id, 'moderation', 'You’re live 🎉', 'People near you can see you now. Start liking!', '/discover');
  end if;
  return new;
end;
$$;

create or replace trigger profiles_went_live
after insert or update on public.profiles
for each row execute function private.profile_went_live();

-- Photos show as soon as they're uploaded; the first one becomes the main photo.
create or replace function private.guard_media_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null or public.is_staff()
     or coalesce(current_setting('soko.system', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'approved';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.is_cover := not exists (
      select 1 from public.profile_media
      where profile_id = new.profile_id and status = 'approved' and is_cover
    );
    return new;
  end if;
  new.status := old.status;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.storage_path := old.storage_path;
  new.profile_id := old.profile_id;
  return new;
end;
$$;

alter policy media_insert_own on public.profile_media
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = auth.uid())
    and status in ('uploaded', 'approved')
  );

-- When photos change, keep one main photo and keep the profile's status honest:
-- the last photo gone takes a live profile down; the first photo on a finished draft puts it live.
create or replace function private.media_recheck_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := coalesce(new.profile_id, old.profile_id);
  p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = v_profile;
  if not found then return null; end if;

  perform set_config('soko.system', 'on', true);
  if not exists (select 1 from public.profile_media where profile_id = v_profile and status = 'approved' and is_cover) then
    update public.profile_media set is_cover = true
    where id = (
      select id from public.profile_media
      where profile_id = v_profile and status = 'approved'
      order by sort_order, created_at limit 1
    );
  end if;
  if p.status = 'live' and not private.profile_ready(p) then
    update public.profiles set status = 'draft' where id = v_profile;
  elsif p.status = 'draft' and private.profile_ready(p) then
    update public.profiles set status = 'live', published_at = coalesce(published_at, now()) where id = v_profile;
  end if;
  perform set_config('soko.system', 'off', true);
  return null;
end;
$$;

create or replace trigger profile_media_recheck
after insert or update of status or delete on public.profile_media
for each row execute function private.media_recheck_profile();

-- Staff review is now a check after the fact.
create or replace function public.staff_review_profile(p_profile uuid, p_approve boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_account uuid;
  v_status public.profile_status;
begin
  if not public.is_staff() then raise exception 'forbidden'; end if;
  select account_id, status into v_account, v_status from public.profiles where id = p_profile;
  if v_account is null then raise exception 'not_found'; end if;
  if p_approve then
    if not exists (select 1 from public.profile_media where profile_id = p_profile and status = 'approved') then
      raise exception 'needs_approved_photo';
    end if;
    update public.profiles
    set status = 'live', flagged_reason = null, checked_at = now(), published_at = coalesce(published_at, now())
    where id = p_profile;
    if v_status <> 'live' then
      insert into public.notifications (account_id, kind, title, body, href)
      values (v_account, 'moderation', 'You’re live 🎉', 'Your profile is showing on Discover.', '/discover');
    end if;
  else
    -- Taken down: stays out until a person looks again.
    update public.profiles set status = 'draft', flagged_reason = 'needs_changes', checked_at = now() where id = p_profile;
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_account, 'moderation', 'Your profile needs a change', coalesce(p_note, 'Please update your profile. We’ll look again.'), '/studio/profile');
  end if;
  update public.moderation_cases set status = 'resolved'
  where target_type = 'profile' and target_id = p_profile and status <> 'resolved';
  perform private.audit(case when p_approve then 'profile.approve' else 'profile.reject' end, 'profiles', p_profile,
                        jsonb_build_object('note', p_note));
  return jsonb_build_object('id', p_profile, 'approved', p_approve);
end;
$$;

revoke execute on function private.profile_ready(public.profiles) from public, anon, authenticated;
revoke execute on function private.owner_profile_status() from public, anon, authenticated;
revoke execute on function private.profile_went_live() from public, anon, authenticated;
revoke execute on function private.media_recheck_profile() from public, anon, authenticated;

-- Members who finished their profile but were stuck waiting go live now.
do $$
begin
  perform set_config('soko.system', 'on', true);
  update public.profiles p set status = 'live', published_at = coalesce(published_at, now())
  where p.status in ('draft', 'pending_review') and private.profile_ready(p)
    and not exists (select 1 from public.accounts a where a.id = p.account_id and a.is_test);
  perform set_config('soko.system', 'off', true);
end $$;

-- ========================================================================
-- 00029_all_areas.sql
-- ========================================================================
-- Every city and area the app offers must exist in the database, or members there can't save an area (and can't go live).
with wanted(city_slug, city_name, area_slug, area_name, sort_order) as (values
('nairobi','Nairobi','westlands','Westlands',0),
('nairobi','Nairobi','kilimani','Kilimani',1),
('nairobi','Nairobi','kileleshwa','Kileleshwa',2),
('nairobi','Nairobi','lavington','Lavington',3),
('nairobi','Nairobi','cbd','CBD',4),
('nairobi','Nairobi','south-b','South B',5),
('nairobi','Nairobi','karen','Karen',6),
('nairobi','Nairobi','parklands','Parklands',7),
('nairobi','Nairobi','thika-road','Thika Road',8),
('mombasa','Mombasa','nyali','Nyali',0),
('mombasa','Mombasa','bamburi','Bamburi',1),
('mombasa','Mombasa','old-town','Old Town',2),
('mombasa','Mombasa','kizingo','Kizingo',3),
('kisumu','Kisumu','milimani','Milimani',0),
('kisumu','Kisumu','mamboleo','Mamboleo',1),
('kisumu','Kisumu','cbd','CBD',2),
('kisumu','Kisumu','kondele','Kondele',3),
('nakuru','Nakuru','section-58','Section 58',0),
('nakuru','Nakuru','milimani','Milimani',1),
('nakuru','Nakuru','london','London',2),
('nakuru','Nakuru','cbd','CBD',3),
('eldoret','Eldoret','elgon-view','Elgon View',0),
('eldoret','Eldoret','pioneer','Pioneer',1),
('eldoret','Eldoret','west-indies','West Indies',2),
('eldoret','Eldoret','cbd','CBD',3),
('thika','Thika','makongeni','Makongeni',0),
('thika','Thika','boma','Boma',1),
('thika','Thika','kiandutu','Kiandutu',2),
('thika','Thika','cbd','CBD',3),
('machakos','Machakos','mjini','Mjini',0),
('machakos','Machakos','katoloni','Katoloni',1),
('machakos','Machakos','kalama','Kalama',2),
('machakos','Machakos','cbd','CBD',3),
('kitale','Kitale','milimani','Milimani',0),
('kitale','Kitale','hospital','Hospital',1),
('kitale','Kitale','section-six','Section Six',2),
('kitale','Kitale','cbd','CBD',3),
('kakamega','Kakamega','milimani','Milimani',0),
('kakamega','Kakamega','amalemba','Amalemba',1),
('kakamega','Kakamega','shirere','Shirere',2),
('kakamega','Kakamega','cbd','CBD',3),
('kisii','Kisii','mwembe','Mwembe',0),
('kisii','Kisii','nyanchwa','Nyanchwa',1),
('kisii','Kisii','university','University',2),
('kisii','Kisii','cbd','CBD',3),
('nyeri','Nyeri','ruringu','Ruring’u',0),
('nyeri','Nyeri','kingongo','King’ong’o',1),
('nyeri','Nyeri','whitehouse','Whitehouse',2),
('nyeri','Nyeri','cbd','CBD',3),
('meru','Meru','milimani','Milimani',0),
('meru','Meru','makutano','Makutano',1),
('meru','Meru','gakoromone','Gakoromone',2),
('meru','Meru','cbd','CBD',3),
('malindi','Malindi','casuarina','Casuarina',0),
('malindi','Malindi','maweni','Maweni',1),
('malindi','Malindi','silversands','Silversands',2),
('malindi','Malindi','cbd','CBD',3),
('naivasha','Naivasha','karagita','Karagita',0),
('naivasha','Naivasha','kihoto','Kihoto',1),
('naivasha','Naivasha','lake-view','Lake View',2),
('naivasha','Naivasha','cbd','CBD',3),
('kericho','Kericho','milimani','Milimani',0),
('kericho','Kericho','township','Township',1),
('kericho','Kericho','brookside','Brookside',2),
('kericho','Kericho','cbd','CBD',3),
('embu','Embu','dallas','Dallas',0),
('embu','Embu','blue-valley','Blue Valley',1),
('embu','Embu','majengo','Majengo',2),
('embu','Embu','cbd','CBD',3),
('nanyuki','Nanyuki','milimani','Milimani',0),
('nanyuki','Nanyuki','likii','Likii',1),
('nanyuki','Nanyuki','sports','Nanyuki Sports',2),
('nanyuki','Nanyuki','cbd','CBD',3),
('garissa','Garissa','township','Township',0),
('garissa','Garissa','bulla-iftin','Bulla Iftin',1),
('garissa','Garissa','medina','Medina',2),
('garissa','Garissa','cbd','CBD',3),
('kitui','Kitui','kalundu','Kalundu',0),
('kitui','Kitui','miambani','Miambani',1),
('kitui','Kitui','township','Township',2),
('kitui','Kitui','cbd','CBD',3),
('homa-bay','Homa Bay','sofia','Sofia',0),
('homa-bay','Homa Bay','makongeni','Makongeni',1),
('homa-bay','Homa Bay','shauri-yako','Shauri Yako',2),
('homa-bay','Homa Bay','cbd','CBD',3),
('migori','Migori','oruba','Oruba',0),
('migori','Migori','namba','Namba',1),
('migori','Migori','nyasare','Nyasare',2),
('migori','Migori','cbd','CBD',3)
),
new_cities as (
  insert into public.locations (kind, name, slug, country_code, sort_order)
  select distinct 'city'::location_kind, w.city_name, w.city_slug, 'KE', 100
  from wanted w
  where not exists (select 1 from public.locations l where l.kind = 'city' and l.slug = w.city_slug)
  returning id, slug
),
cities as (
  select id, slug from public.locations where kind = 'city'
  union all
  select id, slug from new_cities
)
insert into public.locations (kind, parent_id, name, slug, country_code, sort_order)
select 'area'::location_kind, c.id, w.area_name, w.area_slug, 'KE', w.sort_order
from wanted w join cities c on c.slug = w.city_slug
where not exists (
  select 1 from public.locations l where l.kind = 'area' and l.parent_id = c.id and l.slug = w.area_slug
);

-- ========================================================================
-- 00030_campuses.sql
-- ========================================================================
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
  delete from private.campus_codes where account_id = v_uid;
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

-- ========================================================================
-- 00031_hide_from_campus.sql
-- ========================================================================
-- "Hide me from my campus": a verified student can disappear for other verified students at the
-- same campus (Discover, Browse, profile links) — free, because coursemates are the people most
-- students worry about. Same exception as Incognito: anyone they've already liked still sees them.
-- Fair play: while hidden, their own campus deck is off (enforced in the app's /api/discover).

alter table public.campus_members add column if not exists hide_from_campus boolean not null default false;

grant select (hide_from_campus) on table public.campus_members to authenticated;
grant update (show_on_profile, hide_from_campus) on table public.campus_members to authenticated;

-- True when p_account hides from their campus and p_viewer is verified at the same campus.
create or replace function private.hidden_by_campus(p_account uuid, p_viewer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_viewer is not null and exists (
    select 1
    from public.campus_members them
    join public.campus_members me on me.campus_id = them.campus_id
    where them.account_id = p_account
      and them.hide_from_campus
      and me.account_id = p_viewer
  );
$$;

create or replace function public.profile_hidden_from_me(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_account is distinct from (select auth.uid())
    and (private.has_incognito(p_account) or private.hidden_by_campus(p_account, (select auth.uid())))
    and not exists (
      select 1 from public.likes l
      join public.profiles mine on mine.id = l.profile_id
      where l.actor_id = p_account
        and mine.account_id = (select auth.uid())
        and l.kind in ('like', 'super', 'spotlight')
    );
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
    'hideFromCampus', m.hide_from_campus,
    'method', m.method,
    'verifiedAt', m.verified_at
  )
  from public.campus_members m join public.campuses c on c.id = m.campus_id
  where m.account_id = (select auth.uid());
$$;

revoke all on function public.my_campus() from public, anon;
grant execute on function public.my_campus() to authenticated;
revoke all on function public.profile_hidden_from_me(uuid) from public;
grant execute on function public.profile_hidden_from_me(uuid) to anon, authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;

-- ========================================================================
-- 00032_comrade_gold.sql
-- ========================================================================
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

-- Leftover empty table from a connection test (never used by the app).
drop table if exists public._kutana_probe;

commit;
