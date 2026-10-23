-- Launch checklist: seed and test profiles (00024 / 00025) are hidden from member decks, cards
-- and counts in production. Staff still see them, so the owner can keep testing. To show them to
-- everyone again (e.g. a demo):
--   update private.settings set value = 'on' where key = 'show_test_profiles';

insert into private.settings (key, value) values ('show_test_profiles', 'off') on conflict (key) do nothing;

create or replace function public.test_profiles_visible()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or coalesce((select value from private.settings where key = 'show_test_profiles'), 'off') = 'on';
$$;
revoke all on function public.test_profiles_visible() from public;
grant execute on function public.test_profiles_visible() to anon, authenticated;

-- Same as 00052, plus the test-profile rule.
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
    cam.short_name as campus_name,
    p.intent_tags,
    case when coalesce(acc.country_code, 'KE') <> 'KE' then acc.country_code end as away_country,
    hc.name as home_city_name,
    trip.arrives_on as visit_arrives
   from profiles p
     join locations c on c.id = p.city_id
     left join locations a on a.id = p.area_id
     left join profile_media m on m.profile_id = p.id and m.is_cover = true and m.status = 'approved'::media_status
     left join accounts acc on acc.id = p.account_id
     left join campus_members cm on cm.account_id = p.account_id and cm.show_on_profile
     left join campuses cam on cam.id = cm.campus_id and cam.status <> 'closed'
     left join locations hc on hc.id = acc.home_city_id
     left join lateral (
       select t.arrives_on from public.trips t
       where t.account_id = p.account_id and t.city_id = p.city_id and t.status = 'active'
         and current_date between t.arrives_on - 14 and t.leaves_on
       order by t.arrives_on limit 1
     ) trip on true
  where p.status = 'live'::profile_status and p.flagged_reason is null and not profile_hidden_from_me(p.account_id)
    -- Members living abroad show in Kenyan decks with Home & Away, or around a Coming Home trip.
    and (coalesce(acc.country_code, 'KE') = 'KE' or public.listed_at_home(p.account_id) or trip.arrives_on is not null)
    -- Test profiles: staff only, unless the owner switches them on for everyone.
    and (not coalesce(acc.is_test, false) or public.test_profiles_visible());
