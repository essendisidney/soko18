# SOKO18 — dating app (read this first)

As of 30 Sep 2026 SOKO18 is a **mainstream paid dating app for Kenya**. This file overrides anything
older in `SOKO18_MASTER_DEVELOPMENT.md`, `PHASE_STATUS.md` and the other docs where they disagree.

## What changed

- **One kind of member.** Everyone signs up the same way, has a profile, swipes and matches.
  No "owners" selling to "seekers". (`account_role` still has the old values; ignore `owner`/`seeker`.)
- **Everyone can pay.** Revenue is plans, Boosts, Super Likes and Incognito, all by M-Pesa STK.
- **Removed:** provider tiers (KES 5,000 / 10,000), Spotlight 4h, Featured 7d, Tonight bundle,
  Golden Hour, Mystery match, Skip the line, paid Safety pack, post-match ratings, live photo/voice
  proof, the `availability` field, "Men around you".
- **Added:** gender + "Show me", "Looking for" (relationship / casual / friends / not sure),
  a free daily like cap, Super Likes, "Likes you" (Gold), Boost for 30 min, paid-services filter.
- **Safety is free** for everyone (panic, live share, second trusted contact, ID verification).

## Hard rules

1. SOKO18 never takes a cut of, handles, or arranges anything between members.
2. Profiles and messages offering or requesting paid services are held and reviewed
   (`private.looks_like_paid_service` in the DB, `lib/safety/paid-services.ts` in the app).
   Don't weaken or bypass this — it's what keeps the M-Pesa till, hosting and the business legal.
3. No escort, "rates", "incall/outcall", "sponsor" or per-hour language anywhere in product copy.
4. Never a paid perk without a ledger row. Prices live in `public.products`.
5. Never invent counts (members, waitlists, likes).

## Price list (`public.products`, mirrored in `lib/payments/catalog.ts`)

| SKU | KES | What |
|---|---|---|
| gold_week | 149 | Gold 7 days + 3 Super Likes |
| gold_month | 499 | Gold 30 days + 5 Super Likes |
| platinum_month | 999 | Gold + message before match (5/day) + Incognito + 1 Boost + 10 Super Likes |
| boost_1 / boost_5 | 99 / 399 | 30 min top of the local deck |
| super_1 / super_5 | 49 / 199 | Super Likes |
| incognito_month | 299 | Only people you like see you |

Free: 30 likes per Nairobi day, matches, chat, safety tools.

## Money flow

`POST /api/payments/checkout {sku, phone}` → pending `transactions` row (RLS checks price) →
Daraja STK push → Safaricom calls `/api/payments/mpesa/callback?t=MPESA_CALLBACK_SECRET` →
`settle_mpesa_checkout` → ledger debit + credit → subscription / perks. The app polls
`/api/payments/status`. Sandbox settle (`/api/payments/sandbox/complete`) only works while
`private.settings.payments_sandbox = 'on'`. **Turn it off when M-Pesa goes live:**

```sql
update private.settings set value = 'off' where key = 'payments_sandbox';
```

## Key database functions

`my_entitlements()`, `liked_me()`, `use_boost()`, `settle_sandbox_transaction()`,
`settle_mpesa_checkout()` / `fail_mpesa_checkout()` / `attach_mpesa_checkout()` (service role only).
Triggers enforce the like cap (`like_limit`), Super Like balance (`no_super_likes`), the paid-services
hold, and that nobody sets `boost_until` except `use_boost()`.
