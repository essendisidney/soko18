-- Staff may append audit rows for their own actor_id. No updates/deletes.

create policy audit_insert_staff on public.audit_logs
  for insert
  with check (actor_id = auth.uid() and public.is_staff());
