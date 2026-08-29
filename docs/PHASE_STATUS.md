# Phase status

Current phase: **16 Production** — Vercel, GitHub CI, env, health, legal pages.

| Phase | Name | Status | Notes |
|---|---|---|---|
| 01 | Foundation | complete | |
| 02 | Design system | complete | Nairobi home, Active now, Nairobi Now, PWA manifest |
| 03 | Authentication | ui_complete | Guest discover, auth wall, login/signup, proxy. Live `accounts` row + logout revoke when env is set |
| 04 | Profiles | ui_complete | Draft CRUD, unique slug, Nairobi area. Cannot self-set `live`. Public 404s drafts |
| 05 | Media + moderation | ui_complete | Upload → scan stub → queue → decide. Owner cannot approve. Public surfaces use approved HTTPS photos only |
| 06 | Discover | ui_complete | Server rank, featured ≤ 1 per 8, pass exclusions 30 days, impressions |
| 07 | Browse + cities | ui_complete | Nairobi live; Kisumu/Mombasa waitlist; search; categories; labeled Featured |
| 08 | Likes + matches | ui_complete | One-way like is silent; mutual match notifies once; conversation shell after match |
| 09 | Messaging | ui_complete | Participant-only reads; block severs send; report in thread; realtime after RLS |
| 10 | Studio | ui_complete | Own stats only; health + Improve; Boost returns payment_required, never a free row |
| 11 | Admin | ui_complete | Staff-only 404; overview/users/reports; decide writes actions + audit_logs |
| 12 | Payments | ui_complete | Sandbox intent → ledger → flags. Featured/boost/spotlight until-dates require a ledger row |
| 13 | Analytics | ui_complete | Impressions + likes + matches bump daily stats. Studio 7-day deltas. Admin revenue from ledger |
| 14 | Security | ui_complete | Rate limits; export/delete; logout/ban/delete revoke sessions; private profile-media bucket |
| 15 | Testing | complete | Vitest unit/API; Playwright onboarding + 390px; pgTAP RLS; CI workflow |
| 16 | Production | complete | Legal pages; `/api/health`; security headers; canonical URL; env documented. No paid Supabase project yet |

## Decisions

- **Nairobi first, not Kenya first.** Other cities are waitlist until Nairobi has liquidity (1k → 5k → 10k quality profiles).
- Presence is **area-level only**. No live GPS.
- Organic Nairobi Now is activity-ranked; paid Boost/Spotlight/Featured are labeled and cannot buy organic trending.
- Public profile indexing is **opt-in** (`indexPublic`). Sitemap respects it.
- Ship **PWA** before native stores.
- Seed counts are real seed density (16 Nairobi profiles), not fake 2,847. The 2,847 figure is the density *target*, not a lying KPI.
- Catalog portraits in `/public/seed/` are generated Kenyan-presenting stand-ins (unique per profile). They are not real listings and not scraped photos. Real women appear when they publish through review.
- Empty room: do not lead with “16 live” / “8 active now.” Open, ready, Discover, and Browse show active **areas** until live inventory ≥ 200. Then show real counts. Never invent 1,842.
- Opening payoff is **Discover**. Welcome-back and ready use real catalog pulse only. Never invent matches, views, or “183 new.”
- Discover ranking uses onboarding intent + last area opened. Empty deck: Browse (primary), Saved (secondary). Pulse once per session.
- Discover tab stays Discover. The screen title is Nairobi plus active areas. The card is the product.
- Profile ⋯ is live: Share, Favorite, Report, Block. Favorite/Block work for guests on-device. Report is auth-walled. `/saved` lists on-device favorites.
- Unicorn surfaces (SOKO Ads, consumer Premium, SOKO Verify as a second company, Kenya-wide / Africa) wait until Nairobi has liquidity (1k → 5k → 10k quality profiles).
- Package name is `soko18`.
- **Ship now:** Git + Vercel, seed data, no Supabase required.
- **Supabase later:** when the project is paid. Schema is already in `supabase/migrations/`. Auth UI and walls ship before that; they do not fake a logged-in user.

## Phase 03 notes

- Guest can discover, browse, and pass without an account.
- Like, Spotlight, and Message open `/login`.
- `proxy.ts` refreshes the session only when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
- Roles stay in `accounts.role` + `auth.users.raw_app_meta_data`. Never `user_metadata`.

## Phase 04 notes

- Owners write `draft` / `pending_review` / `paused` only. `POST`/`PATCH` with `status: live` returns 403.
- `GET /api/profiles/:slug` returns live listings only.
- Local drafts stay on-device until Supabase is connected. They never appear on Discover or `/profile/[slug]`.

## Phase 05 notes

- `POST /api/media/upload-url` and `complete` reject `status: approved`.
- `GET /api/media/:id` returns 404 until the photo is approved (`media_pending`).
- Studio can preview pending blobs. Discover, Browse, and `/profile/[slug]` only render `https://` approved catalog photos.
- Admin decide writes a local log. Staff auth for the queue is Phase 11.

## Phase 06 notes

- Ranking is server-side (`GET /api/discover`) with the v1 weights. Featured bonus is capped; at most one featured card per eight.
- Pass is logged locally for 30 days and dropped from the deck. Like/Spotlight still require sign-in.
- Each shown card POSTs `/api/discover/impressions`. Seed ids stay on-device until live UUIDs exist.

## Phase 07 notes

- Nairobi is the only live market (`GET /api/cities/nairobi`, `/nairobi`). `/browse` redirects to `/nairobi`.
- Kisumu, Mombasa, Nakuru, and Eldoret are waitlist doors at `/{city}` and `/{city}/[area]`. `/city/[slug]` redirects there. Browse for those cities returns empty + `waitlist: true`.
- Categories (`/category/trending|verified|featured|rising`) are Nairobi grids. Featured is labeled paid and is not mixed into organic Nairobi Now.
- Search empty state: “No one in Nairobi matches that.” Notify me persists locally and confirms on the city page.

## Phase 08 notes

- `POST /api/likes` requires a session. Guests still hit the auth wall. Pass stays open without an account.
- One-way like returns `matched: false` and does not notify. Mutual like creates a match + conversation once; the overlay fires only when `isNew` is true.
- Seed catalog: Amani (`p1`) has already liked you, so a signed-in like can complete a match. Other seed profiles are one-way.
- `/matches` lists real matches only. `/messages/[id]` is an empty shell until a match exists. The fake seed thread is gone.
- Migration `00002_likes_update.sql` lets a pass become a like and still match once. Apply when a live database exists.

## Phase 09 notes

- `GET/POST /api/conversations/:id/messages` require a session and a match. Non-participants get 404, not the thread.
- Block (`POST /api/conversations/:id/block`) severs send both ways. History stays readable. Report stays in the thread menu.
- Live send is RLS + `00003_message_blocks.sql` (insert denied if either party blocked). Realtime listens to `messages` INSERTs after RLS.
- Seed threads persist in an httpOnly cookie until live conversation UUIDs exist. No fake logged-in user.

## Phase 10 notes

- `GET /api/studio/overview` is session-only and always loads `account_id = auth user`. A `profileId` that is not own returns 403.
- Stats come from the owner’s `profile_daily_stats` and own matches. Seed catalog numbers (Amani’s 4,821) are never shown as your studio.
- `POST /api/studio/boosts` opens a pending transaction. It does not insert `boosts` or set `boost_until` until sandbox settle posts a ledger row.
- Local drafts still drive health on-device when there is no session. Improve → `/studio/profile`.

## Phase 11 notes

- `/admin` is staff-only (`accounts.role` in moderator | admin | support). Everyone else gets 404. APIs return 401/403. Role is never read from `user_metadata`.
- Overview KPIs are live counts, not fake 24k users. Revenue is KES 0 until ledger payments exist.
- `POST /api/admin/moderation/:id/decide` writes `moderation_actions` and `audit_logs` or it fails. Local queue updates only when `audited: true`.
- Migration `00004_admin_audit.sql` lets staff insert their own audit rows. Apply with the live database.

## Phase 12 notes

- `POST /api/studio/boosts` creates a **pending** transaction (sandbox unless `MPESA_SHORTCODE` is set). It never writes `featured_until` / `boost_until` / `spotlight_until`.
- `POST /api/payments/sandbox/complete` settles own pending sandbox txs only: complete transaction → ledger row → then flags. Owner cannot self-complete via table UPDATE.
- Migration `00005_payments_ledger.sql`: owner INSERT pending txs; trigger rejects future paid flags without a matching ledger (or `adjustment`) row.
- Catalog: Boost KES 500 / 24h, Spotlight KES 1,200 / 4h, Featured KES 3,500 / 7d. Nairobi Now cannot be bought.
- Admin `/admin/payments` lists real transactions. Revenue stays KES 0 until completed ledger payments exist.
- Apply migrations only when a live database exists. Do not fake a logged-in user.

## Phase 13 notes

- Discover and public profile POST `/api/discover/impressions`. Live UUIDs persist; seed ids stay on-device. Surfaces: discover | browse | profile. Message bodies and media URLs are never stored.
- Migration `00006_analytics.sql` bumps `profile_daily_stats` (Nairobi calendar day) from impressions, likes/spotlight, and matches. Staff can count impressions. Owners read aggregates only.
- Studio `/studio/analytics` is own 7-day views/likes plus week deltas. Never Amani’s seed counts.
- Admin `/admin/analytics` and overview revenue sum ledger `payment` debits, not pending transactions. KES 0 until ledger rows exist.
- Apply `00006` with the live database. Do not fake a logged-in user.

## Phase 14 notes

- Rate limits (429 `rate_limited`): likes 40/10m, messages 30/10m, reports 8/h, uploads 12/h.
- `POST /api/account/export` and `POST /api/account/delete` require a session. Delete is a soft `deleted_at` + profile `removed` + global sign-out.
- Logout already uses `signOut({ scope: "global" })`. Ban sets `is_banned` and revokes via `SUPABASE_SERVICE_ROLE_KEY` when present (`ban_duration`). Banned/deleted accounts are signed out on the next `currentUser()` check. Never put service_role in `NEXT_PUBLIC_`.
- Migration `00007_security.sql`: private `profile-media` bucket (signed reads only, owner folder = auth uid); `soft_delete_own_account`. Apply with the live database.
- `GET /api/admin/security` returns the advisor baseline. Run `supabase db advisors` when a paid project exists — do not invent findings.
- Roles still never come from `user_metadata`.

## Phase 15 notes

- `npm test` (Vitest): ranking, ledger append, match creation, health score; API discover exclusions, like 401 + match engine, cannot self-publish; SQL RLS contract.
- `npm run test:e2e` (Playwright 390px): onboarding → discover pass → profile → like auth wall; discover/browse/profile/studio/admin.
- `npm run test:rls` (`supabase test db` / pgTAP): anon cannot read pending media; cannot like as someone else; moderation is staff-only. Needs local `supabase start`.
- CI: `.github/workflows/test.yml` runs Vitest, Playwright, and pgTAP. Install browsers with `npx playwright install chromium`.

## Phase 16 notes

- Live origin: `https://soko18.vercel.app`. Set `NEXT_PUBLIC_APP_URL` on Vercel. Sitemap/robots use that origin, not a guessed custom domain.
- Legal (calm, specific): `/terms` (18+), `/privacy` (ODPC minimum, area-level presence, export/delete), `/safety` (report + block). Linked from the age gate, login, Me, and Settings.
- Monitoring: `GET /api/health` → `{ ok, city: nairobi, supabase }`. No secrets. Security headers: nosniff, DENY frames, no geolocation/camera/mic.
- Backups: schema is `supabase/migrations/` in git. Point-in-time recovery waits for a paid Supabase project. Do not create that project in this phase.
- GitHub Actions is the CI gate. Push to `origin/main` when you want Git → Vercel to match local. Do not put `service_role` in `NEXT_PUBLIC_`.

## Post-16 notes

- Profile ⋯ (MDD 5.5): Share copies/shares the public URL. Favorite is guest-local (`soko18_favorites`) and listed at `/saved` from Me. Report requires a session (`POST /api/reports` with `profileId`). Block hides on Discover/Browse immediately; session persists via `POST /api/blocks`.
- Empty room: open/ready/Discover/Browse lead with active areas until live inventory ≥ 200. Studio still shows own stats only — never Amani’s seed views, never a fake “24% better.”
- Discover ranks from onboarding intent, last Nairobi area, passes, and impressions. Empty deck primary is Browse; Undo last pass is secondary. Returning `/` shows Nairobi pulse once per session, then goes to Discover.
- First open: Continue in Nairobi (age + city) → intent → Discover. City and Ready stay as waitlist / bookmark. Matches empty has a gold Discover button. Discover header has no bell or menu.
- PWA: standalone manifest, 192/512 icons, apple-touch icon, `/sw.js`, Me “Add to Home Screen.” Start URL is `/` so age still gates. No web push yet.
- Browse tab opens `/nairobi`. `/browse` redirects. Area and category pages (`/category/trending` …) use the same tab bar. No Supabase this increment.
- Profile ← returns to the last app screen (Discover, Nairobi, Saved). Cold landings go to Discover. Me no longer duplicates Nairobi; Safety is a row.
- Closed threads say “No thread yet” and send you to Discover. Thread back returns to Discover or Matches. Thread block hides them on Discover. Settings no longer shows fake Hide last seen / indexing / restrict-message controls. Indexing stays in Studio.
- Studio, Saved, and Settings stay in the tab bar. Me is the active tab. No Supabase this increment.
- Browse “Near you” is the last Nairobi area opened (area-level, never GPS). Empty Discover Browse opens that area. Area pages have other areas and Share. Saved can remove a person from the grid.
- Discover header leads with that last area. Me → Other cities is waitlist, not a second onboarding.
- Kisumu, Mombasa, Nakuru, and Eldoret are waitlist cities at `/{city}` with real areas and no fake catalog. `/city/{city}` redirects there.
- Me is compact: PWA is a line, not a card, so Looking for and Other cities stay tappable.
- Looking for lives on Me (`/intent`). Intent still ranks Discover. Blocked people are hidden from Similar and listed at `/blocked` from Me. Profile ⋯ Pass returns you to Discover.
- Profile Message does not open a thread until there is a match. Guests still hit the auth wall.
- Matches show the last message, or Say hello. Blocked matches leave the list. Sending refreshes so the preview is there when you return. Guests stay empty + Discover.
- A new match leaves a gold mark on Matches until you open the thread. Threads keep the Matches tab. After the first hello, Discover is the return. No unread counts, no fake replies.
- A guest like or Spotlight is held for 30 minutes. After sign-in it finishes on that person. Not now drops it. No fake session.
- Catalog photos: unique Kenyan-presenting portraits in `/public/seed/`. Not Unsplash reuse, not scraped social photos, not live listings.
- Do not start Ads, Premium, Kenya-wide, or fake density KPIs. Next product work stays Nairobi liquidity, trust, and the Discover loop.
