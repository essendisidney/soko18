-- SOKO18 Phase 01 foundation
-- Apply with Supabase CLI locally. Do not apply blindly to an unrelated live project.

create extension if not exists "pgcrypto";

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.account_role as enum ('seeker', 'owner', 'moderator', 'admin', 'support');
create type public.profile_status as enum ('draft', 'pending_review', 'live', 'paused', 'suspended', 'removed');
create type public.media_status as enum ('uploaded', 'scanning', 'pending_review', 'approved', 'rejected', 'replaced', 'removed');
create type public.location_kind as enum ('country', 'city', 'area');
create type public.verification_kind as enum ('age', 'phone', 'identity', 'profile');
create type public.verification_status as enum ('pending', 'verified', 'rejected', 'expired');
create type public.like_kind as enum ('pass', 'like', 'spotlight');
create type public.moderation_target as enum ('media', 'profile', 'message', 'account');
create type public.moderation_case_status as enum ('open', 'in_review', 'resolved');
create type public.moderation_decision as enum ('approve', 'reject', 'request_replacement', 'remove', 'suspend', 'ban');
create type public.ledger_type as enum ('payment', 'boost', 'spotlight', 'featured', 'subscription', 'payout', 'refund', 'fee', 'adjustment');
create type public.ledger_direction as enum ('debit', 'credit');
create type public.transaction_status as enum ('pending', 'completed', 'failed', 'refunded');
create type public.report_reason as enum ('spam', 'harassment', 'fake', 'underage', 'unsafe', 'other');
create type public.notification_kind as enum ('match', 'message', 'like', 'moderation', 'system');

-- ---------------------------------------------------------------------------
-- Utility
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  kind public.location_kind not null,
  parent_id uuid references public.locations(id) on delete restrict,
  name text not null,
  slug text not null,
  county text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (parent_id, slug)
);

create index locations_parent_idx on public.locations (parent_id);
create index locations_active_city_idx on public.locations (sort_order) where kind = 'city' and is_active;

-- ---------------------------------------------------------------------------
-- Accounts (app user) vs auth.users (identity)
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.account_role not null default 'seeker',
  display_name text,
  date_of_birth date,
  home_city_id uuid references public.locations (id),
  intent text[] not null default '{}',
  onboarding_completed_at timestamptz,
  age_confirmed_at timestamptz,
  last_seen_at timestamptz,
  is_banned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index accounts_city_idx on public.accounts (home_city_id);
create index accounts_role_idx on public.accounts (role);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Categories + profiles
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts (id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  birth_year int,
  city_id uuid not null references public.locations (id),
  area_id uuid references public.locations (id),
  bio text,
  status public.profile_status not null default 'draft',
  is_verified boolean not null default false,
  verified_at timestamptz,
  featured_until timestamptz,
  boost_until timestamptz,
  spotlight_until timestamptz,
  quality_score numeric(5,2) not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_birth_year_adult check (birth_year is null or birth_year <= extract(year from now()) - 18)
);

create index profiles_live_city_idx on public.profiles (city_id, published_at desc) where status = 'live';
create index profiles_featured_idx on public.profiles (featured_until) where featured_until is not null;
create index profiles_status_idx on public.profiles (status);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create table public.profile_categories (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (profile_id, category_id)
);

create table public.profile_media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  status public.media_status not null default 'uploaded',
  sort_order int not null default 0,
  is_cover boolean not null default false,
  scan_result jsonb,
  rejection_reason text,
  reviewed_by uuid references public.accounts (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profile_media_profile_idx on public.profile_media (profile_id, sort_order);
create index profile_media_approved_idx on public.profile_media (profile_id) where status = 'approved';
create index profile_media_queue_idx on public.profile_media (created_at) where status in ('scanning', 'pending_review');

create trigger profile_media_set_updated_at
before update on public.profile_media
for each row execute function private.set_updated_at();

create table public.verification_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  kind public.verification_kind not null,
  status public.verification_status not null default 'pending',
  provider text,
  evidence_path text,
  decided_by uuid references public.accounts (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index verification_account_idx on public.verification_records (account_id, kind);

-- ---------------------------------------------------------------------------
-- Social graph
-- ---------------------------------------------------------------------------

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.accounts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind public.like_kind not null,
  created_at timestamptz not null default now(),
  unique (actor_id, profile_id)
);

create index likes_profile_idx on public.likes (profile_id, created_at desc);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  account_a uuid not null references public.accounts (id) on delete cascade,
  account_b uuid not null references public.accounts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (account_a, account_b),
  constraint matches_ordered check (account_a < account_b)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.accounts (id) on delete cascade,
  body text,
  media_path text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_has_content check (body is not null or media_path is not null)
);

create index messages_thread_idx on public.messages (conversation_id, created_at);

create table public.favorites (
  account_id uuid not null references public.accounts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (account_id, profile_id)
);

create table public.blocks (
  blocker_id uuid not null references public.accounts (id) on delete cascade,
  blocked_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.accounts (id) on delete cascade,
  target_type public.moderation_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_inbox_idx on public.notifications (account_id, created_at desc);

create table public.profile_impressions (
  id bigint generated always as identity primary key,
  account_id uuid references public.accounts (id) on delete set null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  surface text not null,
  created_at timestamptz not null default now()
);

create index profile_impressions_profile_idx on public.profile_impressions (profile_id, created_at desc);

create table public.profile_daily_stats (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  views int not null default 0,
  likes int not null default 0,
  matches int not null default 0,
  messages int not null default 0,
  primary key (profile_id, day)
);

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------

create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  target_type public.moderation_target not null,
  target_id uuid not null,
  status public.moderation_case_status not null default 'open',
  opened_by uuid references public.accounts (id),
  assigned_to uuid references public.accounts (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index moderation_cases_open_idx on public.moderation_cases (created_at) where status in ('open', 'in_review');

create trigger moderation_cases_set_updated_at
before update on public.moderation_cases
for each row execute function private.set_updated_at();

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.moderation_cases (id) on delete cascade,
  actor_id uuid not null references public.accounts (id),
  decision public.moderation_decision not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Money — payment → transaction → ledger. Never mutate balances directly.
-- ---------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  provider text not null,
  provider_ref text unique,
  amount_kes integer not null check (amount_kes >= 0),
  status public.transaction_status not null default 'pending',
  purpose public.ledger_type not null,
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  transaction_id uuid references public.transactions (id),
  type public.ledger_type not null,
  amount_kes integer not null check (amount_kes >= 0),
  direction public.ledger_direction not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index ledger_account_idx on public.ledger_entries (account_id, created_at desc);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  plan text not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.boosts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  transaction_id uuid not null references public.transactions (id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  transaction_id uuid references public.transactions (id),
  amount_kes integer not null check (amount_kes >= 0),
  status public.transaction_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.accounts (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  ip inet,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- Ledger is append-only
create or replace function private.forbid_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'ledger_entries are immutable';
end;
$$;

create trigger ledger_no_update
before update or delete on public.ledger_entries
for each row execute function private.forbid_ledger_mutation();

create or replace function private.forbid_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are immutable';
end;
$$;

create trigger audit_no_update
before update or delete on public.audit_logs
for each row execute function private.forbid_audit_mutation();

-- ---------------------------------------------------------------------------
-- Auth bootstrap — role in accounts + app_metadata, never user_metadata
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.accounts (id, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'display_name', '')
  );

  update auth.users
  set raw_app_meta_data = coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'seeker')
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Mutual like → match + conversation
create or replace function private.handle_like_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  left_id uuid;
  right_id uuid;
  match_id uuid;
begin
  if new.kind = 'pass' then
    return new;
  end if;

  select account_id into owner_id from public.profiles where id = new.profile_id;
  if owner_id is null or owner_id = new.actor_id then
    return new;
  end if;

  if exists (
    select 1 from public.likes
    where actor_id = owner_id
      and profile_id in (select id from public.profiles where account_id = new.actor_id)
      and kind in ('like', 'spotlight')
  ) then
    left_id := least(new.actor_id, owner_id);
    right_id := greatest(new.actor_id, owner_id);

    insert into public.matches (account_a, account_b, profile_id)
    values (left_id, right_id, new.profile_id)
    on conflict (account_a, account_b) do nothing
    returning id into match_id;

    if match_id is not null then
      insert into public.conversations (match_id) values (match_id);
      insert into public.notifications (account_id, kind, title, body, href)
      values
        (new.actor_id, 'match', 'It''s a match', 'You both liked each other.', '/matches'),
        (owner_id, 'match', 'It''s a match', 'You both liked each other.', '/matches');
    end if;
  end if;

  return new;
end;
$$;

create trigger likes_create_match
after insert on public.likes
for each row execute function private.handle_like_match();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.locations enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_categories enable row level security;
alter table public.profile_media enable row level security;
alter table public.verification_records enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.profile_impressions enable row level security;
alter table public.profile_daily_stats enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.subscriptions enable row level security;
alter table public.boosts enable row level security;
alter table public.promotions enable row level security;
alter table public.payouts enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.accounts
    where id = auth.uid()
      and role in ('moderator', 'admin', 'support')
      and deleted_at is null
      and is_banned = false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.accounts
    where id = auth.uid()
      and role = 'admin'
      and deleted_at is null
      and is_banned = false
  );
$$;

-- locations / categories: public read of active rows
create policy locations_read_active on public.locations
  for select using (is_active = true or public.is_staff());

create policy categories_read_active on public.categories
  for select using (is_active = true or public.is_staff());

-- accounts: own row
create policy accounts_select_own on public.accounts
  for select using (id = auth.uid() or public.is_staff());

create policy accounts_update_own on public.accounts
  for update using (id = auth.uid()) with check (id = auth.uid() and role = (select a.role from public.accounts a where a.id = auth.uid()));

-- profiles: live is readable; owner writes draft/paused only (cannot self-set live)
create policy profiles_select_live on public.profiles
  for select using (
    (status = 'live')
    or account_id = auth.uid()
    or public.is_staff()
  );

create policy profiles_insert_own on public.profiles
  for insert with check (account_id = auth.uid() and status in ('draft', 'pending_review'));

create policy profiles_update_own on public.profiles
  for update using (account_id = auth.uid())
  with check (account_id = auth.uid() and status in ('draft', 'pending_review', 'paused'));

create policy profiles_staff_all on public.profiles
  for all using (public.is_staff()) with check (public.is_staff());

create policy profile_categories_select on public.profile_categories
  for select using (
    exists (select 1 from public.profiles p where p.id = profile_id and (p.status = 'live' or p.account_id = auth.uid() or public.is_staff()))
  );

-- media: approved visible; owners see own; staff all. Never anon full table.
create policy media_select on public.profile_media
  for select using (
    status = 'approved'
    or exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = auth.uid())
    or public.is_staff()
  );

create policy media_insert_own on public.profile_media
  for insert with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = auth.uid())
    and status = 'uploaded'
  );

create policy media_staff on public.profile_media
  for all using (public.is_staff()) with check (public.is_staff());

-- social
create policy likes_own on public.likes
  for select using (actor_id = auth.uid() or public.is_staff());

create policy likes_insert_own on public.likes
  for insert with check (actor_id = auth.uid());

create policy matches_participants on public.matches
  for select using (account_a = auth.uid() or account_b = auth.uid() or public.is_staff());

create policy conversations_participants on public.conversations
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.account_a = auth.uid() or m.account_b = auth.uid())
    ) or public.is_staff()
  );

create policy messages_select on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = conversation_id and (m.account_a = auth.uid() or m.account_b = auth.uid())
    ) or public.is_staff()
  );

create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = conversation_id and (m.account_a = auth.uid() or m.account_b = auth.uid())
    )
  );

create policy favorites_own on public.favorites
  for all using (account_id = auth.uid()) with check (account_id = auth.uid());

create policy blocks_own on public.blocks
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy reports_insert on public.reports
  for insert with check (reporter_id = auth.uid());

create policy reports_select on public.reports
  for select using (reporter_id = auth.uid() or public.is_staff());

create policy notifications_own on public.notifications
  for select using (account_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update using (account_id = auth.uid()) with check (account_id = auth.uid());

create policy impressions_insert on public.profile_impressions
  for insert with check (account_id = auth.uid() or account_id is null);

create policy stats_owner on public.profile_daily_stats
  for select using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = auth.uid())
    or public.is_staff()
  );

create policy verification_own on public.verification_records
  for select using (account_id = auth.uid() or public.is_staff());

-- staff-only money + moderation + audit
create policy moderation_cases_staff on public.moderation_cases
  for all using (public.is_staff()) with check (public.is_staff());

create policy moderation_actions_staff on public.moderation_actions
  for all using (public.is_staff()) with check (public.is_staff());

create policy transactions_own on public.transactions
  for select using (account_id = auth.uid() or public.is_admin());

create policy ledger_own on public.ledger_entries
  for select using (account_id = auth.uid() or public.is_admin());

create policy subscriptions_own on public.subscriptions
  for select using (account_id = auth.uid() or public.is_staff());

create policy boosts_owner on public.boosts
  for select using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = auth.uid())
    or public.is_staff()
  );

create policy promotions_owner on public.promotions
  for select using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.account_id = auth.uid())
    or public.is_staff()
  );

create policy payouts_own on public.payouts
  for select using (account_id = auth.uid() or public.is_admin());

create policy audit_admin on public.audit_logs
  for select using (public.is_admin());

-- Live public view of approved cover media (invoker RLS)
create or replace view public.live_profile_cards
with (security_invoker = true) as
select
  p.id,
  p.slug,
  p.display_name,
  p.birth_year,
  p.is_verified,
  p.status,
  p.featured_until,
  p.boost_until,
  c.slug as city_slug,
  c.name as city_name,
  m.storage_path as cover_path
from public.profiles p
join public.locations c on c.id = p.city_id
left join public.profile_media m on m.profile_id = p.id and m.is_cover = true and m.status = 'approved'
where p.status = 'live';

-- Kenya cities (v1)
insert into public.locations (kind, name, slug, county, sort_order) values
  ('country', 'Kenya', 'kenya', null, 0);

insert into public.locations (kind, name, slug, county, sort_order, parent_id)
select 'city', v.name, v.slug, v.county, v.sort_order, l.id
from public.locations l
cross join (values
  ('Nairobi', 'nairobi', 'Nairobi', 1),
  ('Mombasa', 'mombasa', 'Mombasa', 2),
  ('Kisumu', 'kisumu', 'Kisumu', 3),
  ('Nakuru', 'nakuru', 'Nakuru', 4),
  ('Eldoret', 'eldoret', 'Uasin Gishu', 5),
  ('Kisii', 'kisii', 'Kisii', 6),
  ('Kakamega', 'kakamega', 'Kakamega', 7),
  ('Thika', 'thika', 'Kiambu', 8),
  ('Malindi', 'malindi', 'Kilifi', 9),
  ('Kitale', 'kitale', 'Trans Nzoia', 10),
  ('Nyeri', 'nyeri', 'Nyeri', 11),
  ('Machakos', 'machakos', 'Machakos', 12),
  ('Naivasha', 'naivasha', 'Nakuru', 13),
  ('Kericho', 'kericho', 'Kericho', 14),
  ('Meru', 'meru', 'Meru', 15)
) as v(name, slug, county, sort_order)
where l.slug = 'kenya' and l.kind = 'country';

insert into public.locations (kind, name, slug, parent_id, sort_order)
select 'area'::public.location_kind, v.name, v.slug, c.id, v.sort_order
from public.locations c
join (values
  ('kisumu', 'Milimani', 'milimani', 1),
  ('kisumu', 'Mamboleo', 'mamboleo', 2),
  ('kisumu', 'CBD', 'cbd', 3),
  ('kisumu', 'Kondele', 'kondele', 4),
  ('nairobi', 'Westlands', 'westlands', 1),
  ('nairobi', 'Kilimani', 'kilimani', 2),
  ('nairobi', 'CBD', 'nairobi-cbd', 3)
) as v(city_slug, name, slug, sort_order) on c.slug = v.city_slug and c.kind = 'city';
