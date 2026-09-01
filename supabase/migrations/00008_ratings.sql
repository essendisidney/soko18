-- Two-way ratings after a match. ID queue from the owner. Read receipts on messages.
-- Apply with the live database. Do not fake a logged-in user.

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  rater_id uuid not null references public.accounts (id) on delete cascade,
  target_account_id uuid not null references public.accounts (id) on delete cascade,
  score smallint not null check (score >= 1 and score <= 5),
  body text,
  created_at timestamptz not null default now(),
  unique (match_id, rater_id),
  constraint ratings_not_self check (rater_id <> target_account_id)
);

create index ratings_target_idx on public.ratings (target_account_id, created_at desc);

alter table public.ratings enable row level security;

create policy ratings_select on public.ratings
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (m.account_a = auth.uid() or m.account_b = auth.uid())
    )
    or public.is_staff()
  );

create policy ratings_insert on public.ratings
  for insert with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.account_a = auth.uid() or m.account_b = auth.uid())
        and (m.account_a = target_account_id or m.account_b = target_account_id)
        and target_account_id <> auth.uid()
    )
  );

create policy ratings_update on public.ratings
  for update using (rater_id = auth.uid()) with check (rater_id = auth.uid());

create policy messages_update_read on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = conversation_id and (m.account_a = auth.uid() or m.account_b = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = conversation_id and (m.account_a = auth.uid() or m.account_b = auth.uid())
    )
  );

create policy verification_insert_own on public.verification_records
  for insert with check (
    account_id = auth.uid()
    and status = 'pending'
    and decided_by is null
  );
