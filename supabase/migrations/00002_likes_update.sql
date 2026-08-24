-- Pass then like must UPDATE the unique (actor_id, profile_id) row.
-- Match creation on UPDATE, still once (ON CONFLICT DO NOTHING).

create policy likes_update_own on public.likes
  for update using (actor_id = auth.uid())
  with check (actor_id = auth.uid());

drop trigger if exists likes_create_match on public.likes;

create trigger likes_create_match
after insert or update of kind on public.likes
for each row execute function private.handle_like_match();
