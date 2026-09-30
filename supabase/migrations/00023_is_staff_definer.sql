-- is_staff() reads public.accounts, whose RLS policies call is_staff(). Without
-- security definer that recursed forever for signed-in members (stack depth exceeded).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.accounts
    where id = (select auth.uid()) and role in ('moderator', 'admin', 'support')
      and deleted_at is null and is_banned = false
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to anon, authenticated;
