-- Discover cards show a line of bio / first prompt.
drop view if exists public.live_profile_cards;
create view public.live_profile_cards with (security_invoker = true) as
select
  p.id, p.slug, p.display_name, p.birth_year, p.gender, p.looking_for, p.is_verified, p.status, p.boost_until,
  p.bio, p.prompts,
  c.slug as city_slug, c.name as city_name, a.slug as area_slug, a.name as area_name,
  m.storage_path as cover_path
from public.profiles p
join public.locations c on c.id = p.city_id
left join public.locations a on a.id = p.area_id
left join public.profile_media m on m.profile_id = p.id and m.is_cover = true and m.status = 'approved'
where p.status = 'live'
  and p.flagged_reason is null
  and not public.profile_hidden_from_me(p.account_id);
grant select on public.live_profile_cards to anon, authenticated;
