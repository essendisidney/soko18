# contracts.md

Next.js route handlers under `app/api`. All errors are `{ error: { code, message } }`.

## Profiles

`id, slug, displayName, birthYear, citySlug, areaSlug, bio, gender, lookingFor, photos, status`

- `GET /api/discover?city&near&gender=woman|man|any&intent` — ranked swipe deck
- `GET /api/profiles/:slug` — one live profile
- `POST /api/profiles` — create/update own (draft / pending_review / paused only; never `live`)
- `422 paid_services` when a bio offers or asks for paid services

## Swiping

- `POST /api/likes` `{ profileId, kind: "pass" | "like" | "super" }`
- `402 like_limit` — free daily likes used up
- `402 no_super_likes`
- Mutual like → match + conversation (DB trigger)
- `GET /api/likes/received` — count for everyone, people for Gold/Platinum

## Chat

- Supabase Realtime on `messages`, RLS-filtered to match participants
- `422 paid_services` on messages about rates, fees or paid meetups; the DB holds any that slip through

## Payments

- `POST /api/payments/checkout` `{ sku, phone }` → `{ transactionId, provider }`
- `GET /api/payments/status?id=` → `pending | completed | failed`
- `POST /api/payments/mpesa/callback?t=<secret>` — Daraja only
- `POST /api/payments/sandbox/complete` `{ transactionId }` — only while sandbox is on
- `GET /api/me/entitlements`
- `POST /api/boost` — spend one Boost (30 min)

## Safety (free)

- `POST /api/reports` — reasons include `paid_services`
- `POST /api/safety/panic`, `POST /api/safety/share` — to your trusted contacts only
- `POST /api/verify/identity`
