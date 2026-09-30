-- Dating features at the level people expect from global apps:
-- rewind (Gold), intro message before matching (Platinum), profile prompts.

-- ---------------------------------------------------------------------------
-- Profile prompts: up to 3 {q, a} pairs. Checked by the paid-services filter.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists prompts jsonb not null default '[]'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_prompts_shape;
alter table public.profiles
  add constraint profiles_prompts_shape check (
    jsonb_typeof(prompts) = 'array' and jsonb_array_length(prompts) <= 3 and length(prompts::text) <= 1200
  );

create or replace function private.profile_text(p public.profiles)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(p.display_name, '') || ' ' || coalesce(p.bio, '') || ' ' ||
         coalesce((select string_agg(coalesce(e->>'a', ''), ' ') from jsonb_array_elements(p.prompts) e), '');
$$;

create or replace function private.profile_paid_service_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flagged boolean := private.looks_like_paid_service(private.profile_text(new));
begin
  if public.is_staff() then
    return new;
  end if;
  if v_flagged then
    new.flagged_reason := 'paid_services';
    if new.status in ('live', 'pending_review') then
      new.status := 'pending_review';
    end if;
  elsif tg_op = 'UPDATE' then
    new.flagged_reason := old.flagged_reason;
  else
    new.flagged_reason := null;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rewind: Gold/Platinum can take back their last pass (within 24h).
-- ---------------------------------------------------------------------------

create or replace function public.rewind_last_pass()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_like public.likes%rowtype;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if private.active_plan(v_uid) is null then
    raise exception 'gold_required';
  end if;
  select * into v_like
  from public.likes
  where actor_id = v_uid and kind = 'pass' and created_at > now() - interval '24 hours'
  order by created_at desc
  limit 1;
  if not found then
    return jsonb_build_object('profileId', null);
  end if;
  delete from public.likes where id = v_like.id;
  return jsonb_build_object('profileId', v_like.profile_id);
end;
$$;

revoke all on function public.rewind_last_pass() from public, anon;
grant execute on function public.rewind_last_pass() to authenticated;

-- ---------------------------------------------------------------------------
-- Intros: Platinum members can send one short message before matching.
-- The recipient sees it in Likes You. If they like back, it becomes the first message.
-- ---------------------------------------------------------------------------

create table if not exists public.intros (
  id uuid primary key default gen_random_uuid(),
  from_account uuid not null references public.accounts (id) on delete cascade,
  to_profile uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 280),
  held boolean not null default false,
  created_at timestamptz not null default now(),
  unique (from_account, to_profile)
);

create index if not exists intros_to_idx on public.intros (to_profile, created_at desc);

alter table public.intros enable row level security;

drop policy if exists intros_select on public.intros;
create policy intros_select on public.intros
  for select using (
    from_account = (select auth.uid())
    or (
      held = false
      and exists (select 1 from public.profiles p where p.id = to_profile and p.account_id = (select auth.uid()))
    )
    or public.is_staff()
  );

grant select on table public.intros to authenticated;

create or replace function public.send_intro(p_profile uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_today integer;
  v_held boolean;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;
  if coalesce(private.active_plan(v_uid), '') <> 'platinum' then
    raise exception 'platinum_required';
  end if;
  select account_id into v_owner from public.profiles where id = p_profile and status = 'live';
  if v_owner is null or v_owner = v_uid then
    raise exception 'not_found';
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = v_owner and blocked_id = v_uid) or (blocker_id = v_uid and blocked_id = v_owner)
  ) then
    raise exception 'not_found';
  end if;
  select count(*) into v_today from public.intros
  where from_account = v_uid and created_at >= (private.nairobi_today()::timestamp at time zone 'Africa/Nairobi');
  if v_today >= 5 then
    raise exception 'intro_limit';
  end if;

  v_held := private.looks_like_paid_service(p_body);
  insert into public.intros (from_account, to_profile, body, held)
  values (v_uid, p_profile, trim(p_body), v_held)
  on conflict (from_account, to_profile) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'already_sent';
  end if;
  if v_held then
    insert into public.moderation_cases (target_type, target_id, status) values ('message', v_id, 'open');
  end if;

  -- An intro counts as a like, so a like back is a match.
  insert into public.likes (actor_id, profile_id, kind) values (v_uid, p_profile, 'like')
  on conflict (actor_id, profile_id) do update set kind = case when likes.kind = 'pass' then 'like' else likes.kind end;

  if not v_held then
    insert into public.notifications (account_id, kind, title, body, href)
    values (v_owner, 'like', 'Someone sent you a message', 'Open Likes You to read it.', '/likes');
  end if;
  return jsonb_build_object('id', v_id, 'held', v_held);
end;
$$;

revoke all on function public.send_intro(uuid, text) from public, anon;
grant execute on function public.send_intro(uuid, text) to authenticated;

-- When a match forms (conversation row appears), any intro between the pair becomes the first message.
create or replace function private.conversation_carry_intros()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
begin
  select * into v_match from public.matches where id = new.match_id;
  insert into public.messages (conversation_id, sender_id, body, created_at)
  select new.id, i.from_account, i.body, i.created_at
  from public.intros i
  join public.profiles p on p.id = i.to_profile
  where i.held = false
    and ((i.from_account = v_match.account_a and p.account_id = v_match.account_b)
      or (i.from_account = v_match.account_b and p.account_id = v_match.account_a));
  return new;
end;
$$;

drop trigger if exists conversations_carry_intros on public.conversations;
create trigger conversations_carry_intros
after insert on public.conversations
for each row execute function private.conversation_carry_intros();

-- Likes You now includes intros (free members see the message and who sent it —
-- that's the point of paying for Platinum).
create or replace function public.my_intros()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'body', i.body, 'at', i.created_at,
      'profileId', fp.id, 'slug', fp.slug, 'name', fp.display_name
    ) order by i.created_at desc), '[]'::jsonb)
  from public.intros i
  join public.profiles mine on mine.id = i.to_profile and mine.account_id = (select auth.uid())
  join public.profiles fp on fp.account_id = i.from_account and fp.status = 'live'
  where i.held = false
    and not exists (
      select 1 from public.matches m
      where (m.account_a = i.from_account and m.account_b = mine.account_id)
         or (m.account_b = i.from_account and m.account_a = mine.account_id)
    )
    and not exists (select 1 from public.blocks b where b.blocker_id = mine.account_id and b.blocked_id = i.from_account);
$$;

revoke all on function public.my_intros() from public, anon;
grant execute on function public.my_intros() to authenticated;

update public.products
set line = 'Gold, plus message before matching, Incognito, a free Boost and 10 Super Likes.'
where sku = 'platinum_month';

revoke execute on all functions in schema private from public, anon, authenticated;
