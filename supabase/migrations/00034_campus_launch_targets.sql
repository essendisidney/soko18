-- Week-one campus targets: open sooner so the first students get a campus deck quickly.
-- Big public universities open at 50 verified students, smaller ones at 30.
-- Already applied to the live database on 2026-10-09; safe to run again.
update public.campuses set unlock_target = case
  when slug in ('uon', 'ku', 'jkuat', 'moi', 'egerton', 'maseno') then 50
  when slug in ('strathmore', 'usiu', 'daystar', 'mmu', 'tuk', 'dekut') then 30
  else unlock_target end
where status = 'waitlist';
