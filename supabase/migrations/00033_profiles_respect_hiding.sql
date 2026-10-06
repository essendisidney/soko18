-- Incognito and "Hide me from my campus" were only enforced in live_profile_cards. The profiles
-- table's read policy let anyone (even signed out) read every live profile straight from the API,
-- including people who paid to be hidden. Apply the same rule to the table itself.
--
-- profile_hidden_from_me() already lets you see your own profile and anyone who liked you, so
-- matches, Likes You and chats keep working.

drop policy if exists profiles_select_live on public.profiles;
create policy profiles_select_live on public.profiles
  for select using (
    (status = 'live' and not public.profile_hidden_from_me(account_id))
    or account_id = (select auth.uid())
    or public.is_staff()
  );

-- live_profile_cards stays SECURITY DEFINER on purpose: it is the public card surface and needs
-- accounts.is_test and the campus badge, which members can't read for each other. It only returns
-- card columns of live, unflagged, not-hidden profiles.
comment on view public.live_profile_cards is
  'Public Discover cards. Security definer by design: exposes card columns only, and filters live, unflagged, not hidden (incognito / campus) profiles.';
