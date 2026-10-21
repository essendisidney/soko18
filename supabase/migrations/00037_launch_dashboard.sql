-- Launch dashboard for staff: real numbers per Nairobi day, test accounts left out.

create or replace function public.staff_daily(p_days integer default 14)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 14), 90));
  v_today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if not public.is_staff() then
    raise exception 'forbidden';
  end if;
  return (
    select coalesce(jsonb_agg(row_to_json(d) order by d.day desc), '[]'::jsonb)
    from (
      select
        day,
        (select count(*) from public.accounts a
          where not a.is_test and (a.created_at at time zone 'Africa/Nairobi')::date = day) as signups,
        (select count(*) from public.profiles p join public.accounts a on a.id = p.account_id
          where not a.is_test and p.published_at is not null
            and (p.published_at at time zone 'Africa/Nairobi')::date = day) as went_live,
        (select count(*) from public.campus_members m
          where (m.verified_at at time zone 'Africa/Nairobi')::date = day) as students,
        (select count(*) from public.referrals r
          where (r.created_at at time zone 'Africa/Nairobi')::date = day) as invites,
        (select count(*) from public.likes l join public.accounts a on a.id = l.actor_id
          where not a.is_test and l.kind <> 'pass' and (l.created_at at time zone 'Africa/Nairobi')::date = day) as likes,
        (select count(*) from public.matches m
          where (m.created_at at time zone 'Africa/Nairobi')::date = day) as matches,
        (select count(*) from public.messages m
          where (m.created_at at time zone 'Africa/Nairobi')::date = day) as messages,
        (select count(*) from public.transactions t
          where t.status = 'completed' and t.provider <> 'sandbox'
            and (t.created_at at time zone 'Africa/Nairobi')::date = day) as paid,
        (select coalesce(sum(t.amount_kes), 0) from public.transactions t
          where t.status = 'completed' and t.provider <> 'sandbox'
            and (t.created_at at time zone 'Africa/Nairobi')::date = day) as revenue_kes
      from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as g(d)
      cross join lateral (select g.d::date as day) x
    ) d
  );
end;
$$;

revoke all on function public.staff_daily(integer) from public, anon;
grant execute on function public.staff_daily(integer) to authenticated;
