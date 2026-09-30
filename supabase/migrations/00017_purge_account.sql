-- Erase a deleted member's personal data but keep anonymous payment records (needed for tax/audit).
create or replace function public.purge_account(p_account uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.accounts where id = p_account and deleted_at is not null) then
    raise exception 'not_deleted';
  end if;
  delete from public.messages where sender_id = p_account;
  delete from public.intros where from_account = p_account;
  delete from public.likes where actor_id = p_account;
  delete from public.favorites where account_id = p_account;
  delete from public.blocks where blocker_id = p_account or blocked_id = p_account;
  delete from public.verification_records where account_id = p_account;
  delete from public.notifications where account_id = p_account;
  delete from public.consents where account_id = p_account;
  delete from public.member_perks where account_id = p_account;
  delete from public.profiles where account_id = p_account;
  update public.accounts
  set display_name = null, date_of_birth = null, gender = null, looking_for = null,
      intent = '{}', show_me = array['man', 'woman', 'nonbinary'], home_city_id = null, last_seen_at = null
  where id = p_account;
  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (null, 'account.purge', 'accounts', p_account, '{}'::jsonb);
  return jsonb_build_object('purged', p_account);
end;
$$;

revoke all on function public.purge_account(uuid) from public, anon, authenticated;
grant execute on function public.purge_account(uuid) to service_role;

-- Already-purged accounts drop out of the queue.
create or replace function public.accounts_due_for_purge(p_limit integer default 50)
returns table (account_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select a.id from public.accounts a
  where a.deleted_at is not null and a.deleted_at < now() - interval '30 days'
    and (a.display_name is not null or a.date_of_birth is not null
         or exists (select 1 from public.profiles p where p.account_id = a.id))
  order by a.deleted_at
  limit greatest(1, least(p_limit, 200));
$$;

revoke all on function public.accounts_due_for_purge(integer) from public, anon, authenticated;
grant execute on function public.accounts_due_for_purge(integer) to service_role;
