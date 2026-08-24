# Phase status

Current phase: **12 Payments** — sandbox + ledger; featured cannot exist without a ledger row.

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
| 13–16 | | not_started | See MDD |

Do not start Phase 13 until featured cannot exist without a ledger row.

## Decisions

- **Nairobi first, not Kenya first.** Other cities are waitlist until Nairobi has liquidity (1k → 5k → 10k quality profiles).
- Presence is **area-level only**. No live GPS.
- Organic Nairobi Now is activity-ranked; paid Boost/Spotlight/Featured are labeled and cannot buy organic trending.
- Public profile indexing is **opt-in** (`indexPublic`). Sitemap respects it.
- Ship **PWA** before native stores.
- Seed counts are real seed density (16 Nairobi profiles), not fake 2,847. The 2,847 figure is the density *target*, not a lying KPI.
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

- Nairobi is the only live market (`GET /api/cities/nairobi`, `/nairobi`, `/browse`).
- Kisumu, Mombasa, Nakuru, and Eldoret are waitlist landings at `/city/[slug]`. Browse for those cities returns empty + `waitlist: true`.
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
