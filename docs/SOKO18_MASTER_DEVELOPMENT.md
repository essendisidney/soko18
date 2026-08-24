# SOKO18 Master Development Document

**Product:** SOKO18  
**Line:** Discover. Connect. Verify.  
**Status:** Source of truth. Implementation follows this document, not improvisation.  
**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui primitives · Supabase · Vercel · GitHub · Cursor  

This document is the complete build contract: product, brand, UI, architecture, schema, RLS, APIs, moderation, monetization, security, tests, and phased prompts.

Do not start Phase N+1 until Phase N acceptance criteria are green. Track progress in `docs/PHASE_STATUS.md`.

---

## 0. How to use this document

Cursor (and humans) must:

1. Read the current phase in `docs/PHASE_STATUS.md`.
2. Implement only that phase.
3. Stop and mark acceptance criteria when done.
4. Never skip moderation, RLS, ledger, or age-gating to “move faster.”

Non-negotiables:

- 18+ only. Age confirmation before product use. No content involving minors, ever.
- Nothing is published blindly. Media goes upload → scan → queue → review → approve → publish.
- Roles never live in `user_metadata`. Use `accounts.role` + `app_metadata`.
- No client bypass of authorization. RLS is mandatory on every exposed table.
- Money never moves without `transactions` + immutable `ledger_entries`.
- Mobile-first: 375 → 390 → 430, then tablet, then desktop.
- Premium, not classifieds. Not a Tinder clone. Not an “adult website” aesthetic.

---

## 1. Product

### 1.1 Positioning

SOKO18 is a **Nairobi-first** 18+ local discovery product.

Line: **Discover. Connect. Verify.**

It is not “another escort website.” It is not African Tinder. Tinder owns dating. SOKO18 owns **local discovery** — density, trust, and a loop of open → swipe → match → message → return.

Directory economics sit underneath (areas, featured, boosts, studio). The experience on top must feel like a premium consumer app.

Launch identity:

- Do not launch as Kenya.
- Launch as: **we are going to dominate Nairobi.**
- Expand a city only after that city has liquidity.

It is **not**:

- A WordPress directory with a new coat of paint
- A Tinder skin
- A cheap classifieds site
- “Nairobi Hot, but prettier” (that is a 4/10 opportunity)

Target sentence in Nairobi: **“If you're looking for this kind of discovery in Nairobi, you check SOKO18.”**

Target feeling on first screenshot: **“What app is that?”** then **“This looks like a serious, premium app.”**

### 1.1.1 Nairobi first (non-negotiable GTM)

Density creates the network effect. 2,847 live Nairobi profiles beats 17 profiles scattered across Kenya.

Never display a fake city-wide count (1,842, 2,847, “183 new”). Until Nairobi crosses real density, open/browse/discover lead with **place** (active areas), not a small inventory integer. 1,842 / 2,847 are density *targets*, not KPIs to invent on screen.

v1 live market: **Nairobi only.**

Mombasa, Kisumu, Nakuru, Eldoret are waitlist until Nairobi has:

1. ~1,000 quality profiles  
2. Then 5,000  
3. Then 10,000  

Do not spend generic national ads. Recruit Nairobi supply ethically (100 → 500 → 1,000), then consumer acquisition (TikTok / Instagram / X, city-specific, policy-compliant). SEO is the second engine: `/nairobi`, `/nairobi/westlands`, indexable profiles **only with owner consent**.

Ship as a **PWA** first. Then Android. Then iOS subject to store policy.

Presence is **area-level only** (Westlands, Kilimani). Never precise real-time coordinates. Photos, location, biometrics, and sexual data are sensitive under Kenya ODPC rules — minimize collection, encrypt evidence, make privacy a brand feature.

Organic “Nairobi Now” rankings must be activity-based with anti-manipulation caps. Featured/Boost are paid and labeled. Never sell organic trending.

Profile health may say complete profiles **tend** to get more engagement. Never promise guaranteed results.

### 1.2 Who uses it

| Actor | Job to be done |
|---|---|
| Seeker | Discover Nairobi, browse areas, like, match, message |
| Profile owner | Publish a trusted profile, get discovered, promote, see performance |
| Moderator | Review media, reports, and safety cases |
| Admin | Run the platform: users, revenue, policy, bans |
| Guest | Taste Discover after age + city + intent. Auth required to like, message, or create a profile |

### 1.3 Capabilities (v1)

Nairobi density · swipe discovery · area browse · Active now (area-level) · Nairobi Now rankings · profiles as landing pages · SOKO18 Verified · likes/matches · messaging · Studio health · boosts (flagged) · moderation · PWA · index opt-in.

### 1.4 Product principle (gate every screen)

1. Can I understand it in 2 seconds?
2. Can I perform the primary action with one hand?
3. Is there too much text?
4. Is there visual hierarchy?
5. Does it feel trustworthy?
6. Does it feel premium?
7. Does it feel fast?

If any answer is no: **remove something.**

---

## 2. Brand

### 2.1 Name and mark

Wordmark: **SOKO** with **18** as the brand mark.

Treat `18` as a gold mark, never as decoration, never as a cheap age sticker with flames.

Lockups:

- Horizontal: `SOKO` + small gold `18`
- Stacked (splash only): `SOKO` over `18`

Forbidden: flames, lips, cherries, silhouettes, neon pink, “adult classifieds” iconography.

### 2.2 Voice

Short. Calm. Confident. Kenyan when it helps, never slang for its own sake.

Examples:

- Discover. Connect. Verify.
- People you’ll like.
- You both liked each other.
- Your profile is performing well.

No walls of marketing copy. No emoji spam in product UI (one at most, never on chrome).

---

## 3. Visual direction

DARK · GLASSY · CLEAN · CINEMATIC · MINIMAL · HIGH-CONTRAST · MOBILE-FIRST

Not 25 buttons. Not walls of text. Not cheap gradients. Not a Tinder clone.

### 3.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#070708` | App background |
| `--bg-elevated` | `#111113` | Sheets, studio, admin |
| `--glass` | `rgba(255,252,245,0.05)` | Card/chrome fill |
| `--glass-strong` | `rgba(255,252,245,0.08)` | Hover / pressed glass |
| `--line` | `rgba(255,252,245,0.10)` | Hairline borders |
| `--text` | `#F6F1E8` | Primary text |
| `--muted` | `#8E887C` | Supporting text |
| `--gold` | `#D4B56A` | Brand mark, verified, spotlight |
| `--gold-2` | `#E8C97A` | Gold hover / active |
| `--like` | `#D4B56A` | Like is gold, not Tinder pink |
| `--danger` | `#C45C4A` | Pass emphasis, destructive |
| `--live` | `#7D9B76` | Active / success |
| `--radius-card` | `28px` | Profile cards |
| `--radius-ctl` | `999px` | Pills / round buttons |

Typography:

- Display / wordmark: **Syne**
- UI: **Geist Sans**
- Headings: large, tight tracking
- Body: small, muted, rare

Photography is the UI. Type is a caption. Chrome is almost invisible.

### 3.2 Motion

Functional only.

| Event | Motion |
|---|---|
| Card drag | Follows finger, 1:1 |
| Card release | Spring `stiffness: 380`, `damping: 32` |
| Pass / like commit | Translate + fade 280ms |
| Spotlight (up) | Gold wash + star burst, spring |
| Button press | Scale 0.96, 80ms |
| Bottom sheet | Physics snap |
| Page | Fade + 8px rise, 200ms |
| Images | Crossfade 240ms |
| Skeleton | Soft shimmer |
| Match | Quiet gold particles, not confetti cannon |
| Toast | Rise from bottom |

Never animate for the sake of animation.

---

## 4. Information architecture

```
/                         age + brand (Continue in Nairobi)
/onboarding/city          waitlist (not on the main path)
/onboarding/intent
/onboarding/ready         bookmark only (not on the main path)
/discover                 primary home
/browse
/matches
/messages
/messages/[id]
/me                       current account
/settings
/nairobi                      Nairobi SEO + city home
/nairobi/[area]               Westlands, Kilimani, …
/city/[city]                  waitlist if not Nairobi
/profile/[slug]               public profile (index only if opted in)
/studio                   owner home
/studio/profile
/studio/analytics
/studio/promotions
/studio/settings
/admin                    admin home
/admin/users
/admin/profiles
/admin/moderation
/admin/reports
/admin/payments
/admin/analytics
/login
/signup
```

App tab bar (mobile): **Discover · Browse · Matches · Me**

Messages live under Matches (list + threads), not as a fifth tab.

Desktop: same IA, expanded. Discover card is centered. Browse becomes a rich directory. Studio/Admin become real SaaS layouts.

---

## 5. UI specification

### 5.1 Launch / onboarding

No 17-step registration wall. Age + Nairobi as one tap, then intent, then a real card.

**Screen 1 — Welcome**

- Black field
- Wordmark SOKO + gold 18
- Discover. Connect. Verify.
- Age line: “You must be 18 or older to continue.”
- Primary: Continue in Nairobi (stores age + Nairobi)
- Other cities: waitlist only, not an equal market. Link, not a required step.

**Screen 2 — Intent**

- “What are you looking for?”
- Chips, multi-select, max 3: Connect · Meet · Browse · Featured in Nairobi
- Keep this non-sleazy and short.
- Primary: Discover → `/discover`

`/onboarding/city` stays for waitlist. `/onboarding/ready` is not on the main path.

Auth is prompted at the first like, message, or “create profile” — not before.

### 5.2 Discover (home)

This screen sells the product.

```
SOKO18
Nairobi
Westlands · Kilimani · Kileleshwa

...
│  Amani, 26              │
│  Kilimani · ● Active    │
└─────────────────────────┘

   ×         ♥         ★
  Pass      Like    Spotlight
```

The tab is Discover (the job). The screen title is Nairobi (the place). Do not repeat “Discover” as a page heading.

Rules:

- One card, almost full viewport minus header + actions + tab bar
- Name + age on one line
- City + presence on one line
- Verified badge only if verified
- Three actions only
- Drag left = pass, right = like, up = spotlight
- Release with spring. Commit past 96px or 0.35 velocity

Settings, Safety, Studio, and Admin live in Me. Discover has no bell or hamburger — the tab bar already owns Matches and Me.

### 5.3 Profile card

Expensive object. Large photo, bottom gradient, no clutter.

Drag:

- LEFT/RIGHT: card follows finger, slight rotate (max 8°)
- UP: gold spotlight treatment
- Release: spring back or commit

Tap card → `/profile/[slug]`

### 5.4 Browse = Nairobi

This is the living city, not a Kenya index.

```
SOKO18                 Discover | Browse

Nairobi

Active now · 9 in Nairobi
Westlands 3 · Kilimani 2 · …   (area-level only)

Trending now · Recently active · New today · Verified · Near you

[ DISCOVER ]

Popular areas
Westlands · Kilimani · Kileleshwa · Lavington · CBD
South B · Karen · Parklands · Thika Road

Nairobi Now
Trending · Recently joined · Most viewed · Most liked
Newly verified · Rising
```

Organic rankings from real activity. Paid placement is labeled. Never GPS.

### 5.5 Public profile (mini landing page)

```
←                                ⋯

          [ HERO PHOTO ]

          ✓ SOKO18 VERIFIED
          Amani
          26 · Nairobi · Kilimani
          ● Active

     [ ♥ Like ]   [ Message ]

ABOUT
PHOTOS
VERIFICATION    Phone · Identity · Profile reviewed · Account established
AVAILABILITY    only if the owner set it, lawful, never precise location
SIMILAR         same area first
```

⋯ : Share, Favorite, Report, Block, **Search indexing on/off** (owner).

Favorite is on-device for guests (like Pass). A session persists it. Report needs an account — it opens a staff case. Block hides immediately on Discover and Browse; a session persists it. Indexing is owner-only in Studio / Settings.

### 5.6 Match

Not a Tinder replica.

```
IT'S A MATCH
You + Amani
✦  ✦
You both liked each other.

[ Say Hello ]
Not now
```

Quiet, gold, two photos overlapping slightly. No cartoon hearts.

### 5.7 Messaging

WhatsApp/iMessage simplicity plus safety.

Header: name, verified, presence, ⋯ (report, block, media controls, privacy)

Bubbles: received glass-left, sent gold-tint-right.

Composer: Message… and send. Media send is owner/premium gated in later phases; v1 text-first.

Safety is built into the thread, not buried.

### 5.8 SOKO18 Studio (owner)

```
SOKO18 STUDIO
Good afternoon, Amani
Your profile is performing well.

PROFILE VIEWS     4,821   ↑ 18%
LIKES               386   ↑ 24%
CONNECTIONS         104   ↑ 12%

PROFILE HEALTH    ████████░░ 82%
Complete your profile to improve discovery.
[ Improve ]

PROMOTE
Boost your profile
[ Boost ]
```

This is a business product. It must feel like a real studio, not an ads upsell page.

### 5.9 Admin

SaaS control centre. Dense but calm. Not consumer chrome.

Overview KPIs: Users, Active today, Profiles, Pending review, Reports.

Moderation: pending images, reported profiles, flagged accounts.

Revenue: today KES, month KES.

Nav: Moderation, Users, Profiles, Payments, Reports, Analytics.

### 5.10 City landing (SEO + product)

```
KISUMU
Discover people around Kisumu
[ Discover ]

Trending · Recently joined · Verified · Active now
Popular areas: Milimani, Mamboleo, CBD, Kondele
Featured profiles
```

Indexable. Same visual language as the app.

---

## 6. Design system components

Build in `components/soko/` and `components/ui/`.

| Component | Role |
|---|---|
| `Button` | primary / ghost / gold / danger / icon |
| `Card` | glass surface |
| `ProfileCard` | discover + browse |
| `Avatar` | presence ring |
| `Badge` | verified, live, featured |
| `Chip` | filters, intent |
| `BottomSheet` | mobile menus |
| `Modal` | match, confirm |
| `Toast` | quiet confirmations |
| `TabBar` | Discover Browse Matches Me |
| `Search` | browse |
| `Filter` | city/category sheet |
| `Gallery` | profile media |
| `MessageBubble` | thread |
| `StatCard` | studio + admin |
| `VerificationBadge` | gold check |
| `Wordmark` | SOKO + 18 |
| `HealthBar` | studio profile health |
| `EmptyState` | one line + one action |
| `Skeleton` | card / grid / thread |

shadcn is the primitive kit (dialog, sheet, sonner). SOKO components own look and feel.

---

## 7. Folder structure

```
app/
  layout.tsx                          root: fonts, tokens, age shell
  page.tsx                            marketing
  (auth)/login, signup
  (onboarding)/welcome, city, intent, ready
  (app)/layout.tsx                    tab bar shell
    discover/page.tsx
    browse/page.tsx
    matches/page.tsx
    messages/page.tsx
    messages/[id]/page.tsx
    me/page.tsx
    settings/page.tsx
  profile/[slug]/page.tsx
  city/[city]/page.tsx
  category/[category]/page.tsx
  studio/(protected)/...
  admin/(protected)/...
  api/                                server contracts

components/
  ui/                                 shadcn primitives
  soko/                               product components
  discover/, browse/, profile/, messages/, studio/, admin/, brand/

lib/
  supabase/client.ts, server.ts, admin.ts
  auth/, money/, moderation/, discovery/, validation/
  data/seed.ts                        UI seed until live data
  types/database.ts

supabase/
  migrations/
  seed.sql

docs/
  SOKO18_MASTER_DEVELOPMENT.md        this file
  PHASE_STATUS.md
```

No `src/` directory.

---

## 8. Domain model

Identity ≠ listing.

- `auth.users` — authentication identity
- `accounts` — app user (seeker, owner, staff)
- `profiles` — public discovery listing (0..1 per account in v1)

A seeker can later become an owner by creating a profile (Studio onboarding).

Other aggregates: locations, media, categories, verification, likes, matches, conversations, messages, favorites, notifications, reports, blocks, moderation, subscriptions, promotions, boosts, transactions, ledger, payouts, audit logs.

---

## 9. Database schema (Postgres / Supabase)

Conventions:

- UUID primary keys, `gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at` via trigger
- FK indexes
- Partial indexes for hot filters
- RLS on every `public` table
- `private` schema for definer functions
- Views: `with (security_invoker = true)`

Canonical SQL lives in `supabase/migrations/`. Summary:

### 9.1 Enums

`account_role`: seeker | owner | moderator | admin | support  
`profile_status`: draft | pending_review | live | paused | suspended | removed  
`media_status`: uploaded | scanning | pending_review | approved | rejected | replaced | removed  
`verification_kind`: age | phone | identity | profile  
`verification_status`: pending | verified | rejected | expired  
`like_kind`: pass | like | spotlight  
`moderation_target`: media | profile | message | account  
`moderation_decision`: approve | reject | request_replacement | remove | suspend | ban  
`ledger_type`: payment | boost | spotlight | featured | subscription | payout | refund | fee | adjustment  
`report_reason`: spam | harassment | fake | underage | unsafe | other  

### 9.2 Core tables

`locations(id, kind, parent_id, name, slug, county, sort_order, is_active)`  
kinds: country | city | area  

`accounts(id pk=auth.users.id, role, display_name, date_of_birth, home_city_id, intent[], onboarding_completed_at, age_confirmed_at, last_seen_at, is_banned, deleted_at)`  

`profiles(id, account_id unique, slug unique, display_name, birth_year, city_id, area_id, bio, status, is_verified, verified_at, featured_until, boost_until, spotlight_until, quality_score, published_at)`  

`profile_media(id, profile_id, storage_path, status, sort_order, is_cover, scan_result, rejection_reason, reviewed_by, reviewed_at)`  

`profile_categories(profile_id, category_id)`  
`categories(id, slug, name, sort_order)`  

`verification_records(id, account_id, profile_id, kind, status, provider, evidence_path, decided_by, decided_at)`  

`likes(id, actor_id, profile_id, kind, created_at)` unique (actor_id, profile_id)  
`matches(id, account_a, account_b, profile_id, created_at)` unique pair, ordered a < b  

`conversations(id, match_id unique)`  
`messages(id, conversation_id, sender_id, body, media_path, read_at)`  

`favorites(account_id, profile_id)`  
`notifications(...)`  
`reports(...)`  
`blocks(blocker_id, blocked_id)`  

`moderation_cases(id, target_type, target_id, status, opened_by, assigned_to)`  
`moderation_actions(id, case_id, actor_id, decision, note)`  

`subscriptions`, `promotions`, `boosts`  
`transactions(id, account_id, provider, provider_ref unique, amount_kes, status, purpose)`  
`ledger_entries(id, account_id, transaction_id, type, amount_kes, direction, metadata)` immutable  
`payouts(...)`  
`audit_logs(id, actor_id, action, entity, entity_id, metadata, ip)` insert-only  

`profile_daily_stats(profile_id, day, views, likes, matches, messages)`  

### 9.3 Indexes (required)

- `profiles(status) where status = 'live'`
- `profiles(city_id) where status = 'live'`
- `profiles(featured_until) where featured_until > now()`
- `profile_media(profile_id, status) where status = 'approved'`
- `profile_media(status) where status in ('scanning','pending_review')`
- `likes(profile_id, created_at desc)`
- `messages(conversation_id, created_at)`
- `audit_logs(created_at desc)`

### 9.4 Triggers

- New `auth.users` → `private.handle_new_user()` inserts `accounts`, copies role into `app_metadata`
- Mutual like → create match + conversation + notifications
- Media approve → maybe flip profile to `live` if cover exists and profile complete
- Ledger append only; no updates/deletes
- `updated_at` bump

---

## 10. RLS policies

Principle: the Data API is hostile. Assume the client is malicious.

| Table | anon | authenticated | staff |
|---|---|---|---|
| locations | read active | read active | write |
| accounts | none | own row | all |
| profiles | read `live` | read live; write own draft/paused | all |
| profile_media | none (signed urls) | own all; others approved only via view | all |
| likes | none | insert own; read own | all |
| matches | none | participants | all |
| messages | none | participants; cannot update others | all |
| reports | none | insert own | all |
| blocks | none | own | all |
| moderation_* | none | none | moderator+ |
| transactions/ledger | none | read own | admin |
| audit_logs | none | none | admin insert via private fn |

Rules:

- UPDATE requires a matching SELECT policy
- Do not expose staff views without `security_invoker`
- Storage bucket `profile-media` is private
- Signed URLs issued only for approved media (or owner/staff of pending)
- `service_role` only on the server, never `NEXT_PUBLIC_`

Authorization for admin/studio routes is server-side from `accounts.role`, not JWT `user_metadata`.

---

## 11. API contracts

Prefer server actions + route handlers. No business logic in the browser.

### Discover

`GET /api/discover?city=&cursor=`  
Returns ranked live profiles the actor has not passed/liked, excluding blocks.

`POST /api/likes` `{ profileId, kind: 'pass'|'like'|'spotlight' }`  
Returns `{ matched: boolean, matchId?: string }`

### Browse

`GET /api/browse?city=&q=&cursor=`  
`GET /api/cities/:slug`

### Profiles

`GET /api/profiles/:slug` — live only, approved media  
`POST /api/profiles` — create own, status draft  
`PATCH /api/profiles/:id` — own, cannot self-publish to live

### Media

`POST /api/media/upload-url` → signed upload  
Object lands as `uploaded`. Server moves to `scanning`. Never public.

### Messages

`GET /api/conversations`  
`GET /api/conversations/:id/messages?cursor=`  
`POST /api/conversations/:id/messages` `{ body }`  
Realtime via Supabase after RLS.

### Studio

`GET /api/studio/overview` — views, likes, connections, health, deltas  
`POST /api/studio/boosts` — creates payment intent, not a free row

### Admin

`GET /api/admin/overview`  
`POST /api/admin/moderation/:id/decide` `{ decision, note }`  
Every decide writes `moderation_actions` + `audit_logs`.

### Account

`POST /api/account/export`  
`POST /api/account/delete` — soft delete + session revoke

Errors: `{ error: { code, message } }` with stable codes (`unauthorized`, `forbidden`, `not_found`, `unverified_age`, `media_pending`, `rate_limited`).

---

## 12. Discovery engine

Hidden. Not a random shuffle.

Score (v1, deterministic, explainable):

```
score =
  location_proximity      * 0.28
+ preference_fit          * 0.12
+ activity_recency        * 0.12
+ profile_quality         * 0.14
+ verification            * 0.12
+ freshness               * 0.08
+ interaction_history     * 0.08
+ safety_penalty          * 0.06   (negative)
+ boost_feature_bonus              (additive, capped)
```

Then:

- Exclude passed (30 days), liked, blocked, self, non-live, banned
- Inject at most 1 spotlight/featured per 8 cards
- Log impressions for later learning (`profile_impressions`)

v2 may reweight from conversion (like → match → reply). v1 must remain explainable.

Implemented as `private.rank_profiles(account_id, city_id)` returning a ranked set. Called from server only.

---

## 13. Moderation workflow

```
UPLOAD → AUTOMATED SCREENING → MODERATION QUEUE → ADMIN REVIEW → APPROVED → PUBLISHED
```

Nothing goes live from the client.

Admin actions: Approve, Reject, Request replacement, Remove image, Suspend profile, Ban account.

Every action: `moderation_actions` + `audit_logs`.

Underage report: freeze profile immediately, hide media, escalate. Zero tolerance.

---

## 14. Monetization

Build the rails in Phase 12, even if flags stay off.

Ladder: Free → Premium → Boost → Spotlight → Featured → Business → Advertising

Every paid action:

`payment → transaction → ledger → receipt → analytics → reconciliation`

No “just set featured_until in the dashboard” without a ledger row (admin comps still write `ledger_type = adjustment`).

Currency: **KES**. Amounts are integer cents? No — store integer **KES** for v1 (no decimals in M-Pesa) plus `amount_minor` int for future.

Providers: M-Pesa first (Phase 12), card later.

---

## 15. Security

- RLS on all public tables
- Signed media URLs, short TTL
- RBAC from `accounts.role` + `app_metadata`
- Rate limit likes, messages, reports, uploads
- CSRF: Next.js server actions + same-origin; proxy for session refresh
- Audit logs for staff and money
- Session revoke on logout, ban, and delete
- Account deletion + data export
- Privacy: hide last-seen, hide profile, block, restrict messages, **opt-in public indexing**
- Area-level presence only. No live GPS in product UI.
- ODPC: photos, location, biometrics, sex/orientation are sensitive. Collect the minimum. Verification evidence stays off `public`.
- Encrypt highly sensitive verification evidence at rest (storage bucket not public; consider pgsodium later)
- Never log message bodies or media URLs in analytics
- Age gate cookie + server check

Sensitive 18+ data: minimize what is stored. Bios and photos are enough. No national ID numbers in `public`.

---

## 16. Testing requirements

| Layer | Tool | Must cover |
|---|---|---|
| Unit | Vitest | ranking, ledger append, match creation, health score |
| RLS | `supabase test` / pgTAP | anon cannot read pending media; user cannot like as someone else; staff-only moderation |
| API | Vitest + fetch | discover exclusions, like→match, cannot self-publish |
| E2E | Playwright | onboarding → discover swipe → profile → like (auth wall) |
| Visual | Playwright 390px | discover, browse, profile, studio, admin |

Do not ship a phase that breaks RLS tests.

---

## 17. Phased implementation

### PHASE 01 — Foundation

**Goal:** runnable app shell, tokens, folders, env, schema files, no fake product yet beyond a branded splash.

Create: Next.js app, folder structure, `globals.css` tokens, Wordmark, `.env.example`, Supabase client stubs, `supabase/migrations/00001_foundation.sql`, this MDD, phase status.

**Acceptance**

- `npm run dev` boots
- `npm run lint` passes
- Dark cinematic shell at `/`
- Age-gated welcome route exists
- Schema SQL is complete and documented
- No live data required

### PHASE 02 — Design system

All listed components, motion primitives, 390px gallery of components at `/dev/ui`.

**Acceptance:** every component rendered; tokens only; no random colors.

### PHASE 03 — Authentication

Supabase auth, session in proxy, login/signup, guest mode, role bootstrap.

**Acceptance:** signup creates `accounts` row; JWT role in `app_metadata`; logout revokes.

### PHASE 04 — Profiles

CRUD draft profiles, slug, city, bio, public profile page (live only).

**Acceptance:** cannot set `status=live` from client; public 404s drafts.

### PHASE 05 — Media + moderation

Upload, scan stub, queue, admin decide, signed URLs.

**Acceptance:** unapproved images never appear on Discover/Browse/Profile.

### PHASE 06 — Discover

Swipe deck, ranking function, impression log.

**Acceptance:** drag physics; pass/like/spotlight; empty state.

### PHASE 07 — Browse + cities

Search, city pages, categories, trending.

**Acceptance:** city landing works for Kisumu, Nairobi, Mombasa at minimum.

### PHASE 08 — Likes + matches

Mutual like → match + overlay + conversation shell.

**Acceptance:** one-way like does not notify match; mutual does once.

### PHASE 09 — Messaging

Threads, realtime, report/block in thread.

**Acceptance:** non-participants cannot read; block severs send.

### PHASE 10 — Studio

Overview, health, improve, boost CTA (flagged).

**Acceptance:** owner sees only own stats.

### PHASE 11 — Admin

Overview, moderation queue, users, reports.

**Acceptance:** non-admin 404/403; every decide audited.

### PHASE 12 — Payments

M-Pesa (or sandbox), transactions, ledger, boost/spotlight/featured flags from ledger.

**Acceptance:** featured cannot exist without ledger.

### PHASE 13 — Analytics

Impressions, studio deltas, admin revenue.

### PHASE 14 — Security hardening

Advisors, rate limits, export/delete, session revoke, storage audit.

### PHASE 15 — Testing

Vitest + Playwright + RLS tests green in CI.

### PHASE 16 — Production

Vercel + GitHub + Supabase prod, env, backups, monitoring, legal pages.

---

## 18. Phase prompt template

Use this when starting a phase:

```
You are building SOKO18.
Read docs/SOKO18_MASTER_DEVELOPMENT.md and docs/PHASE_STATUS.md.
Implement ONLY Phase XX.
Do not start the next phase.
Follow acceptance criteria exactly.
Use existing tokens and components.
If a product decision is missing, pick the conservative, safer option and record it in PHASE_STATUS.md.
```

---

## 19. Launch experience (must not regress)

Open app → age + Nairobi (one tap) → intent → **beautiful Nairobi card**.

Install as a **standalone PWA** (home screen) before native stores. Manifest starts at `/` so age still gates first open. Icons are 192 and 512. Me explains Add to Home Screen.

Returning users: Nairobi pulse once per session (place first — active areas — then real counts only after density; never invented matches or a fake 1,842) → **Discover**. Later opens in that session go straight to the card. Discover ranking uses onboarding intent and the last Nairobi area opened.

Auth is a doorway to actions, not to the product.

---

## 20. Geography

**Live:** Nairobi.

Areas (v1): Westlands, Kilimani, Kileleshwa, Lavington, CBD, South B, Karen, Parklands, Thika Road.

**Waitlist:** Mombasa, Kisumu, Nakuru, Eldoret, then the rest of Kenya, then East/West Africa — only after Nairobi liquidity.

SEO: `/nairobi`, `/nairobi/[area]`. `/city/[city]` waitlists non-Nairobi cities.

---

## 21. Legal / trust (ship before public)

- 18+ terms
- Privacy policy
- Community / safety guidelines
- Report + block
- Data export + deletion

Copy is calm and specific. Not a joke.

---

## 22. Definition of done for “real product”

A stranger on a phone can:

1. Confirm 18+ and Nairobi
2. Pick intent
3. See a cinematic Nairobi card
4. Open a profile
5. Browse a city
6. Understand verification
7. Hit auth only when they like or message

Owners can open Studio and see health.  
Admins can open a queue.  
No unclassified image can appear in Discover.

Until that is true, SOKO18 is not launched. It is a build.
