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
| comrade_week / comrade_month | 49 / 199 | Comrade Gold: Gold at a student price, verified students only (Kenya) |

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

## Global upgrade (30 Sep 2026)

**Trust:** real photo uploads (resized on the phone), selfie verification with a random pose,
one staff review queue at `/admin/queue` (flagged profiles/messages, selfies, photos, new profiles),
growth funnel at `/admin/funnel`. Members can't approve or verify themselves (DB triggers).

**Dating features:** Rewind (Gold), message before matching (Platinum, 5/day; becomes the first
message on match), profile prompts (checked by the paid-services filter), age and gender filters,
Likes You grid.

**Compliance:** first sign-in collects date of birth (server-checked 18+) and consent to Terms,
Privacy and sensitive data (gender / Show me), versioned in `consents`. 2-step sign-in (TOTP);
staff with it on must pass it for admin. Full data export. Deleted accounts are anonymised after
30 days by `/api/cron/purge` (payment records kept, anonymous).

**Growth:** English / Kiswahili / Français, web push (lock screen shows no names), offline page,
cached assets, no paid image optimisation for member photos.

**Markets:** `markets` + `product_prices`. Kenya is live (M-Pesa + card). TZ, UG, RW, NG, GH, ZA,
CI, GB, US are waitlist with draft prices — review prices, the law and payment methods for each
country before switching `status` to `live`. Visitors' country comes from Vercel's edge; members can
change it in Settings. Free-like "days" follow each market's clock. Card payments use Paystack
(signature-checked webhook). Never sum different currencies (the funnel reports them separately).

To open a market:
```sql
update public.markets set status = 'live' where country_code = 'NG';
```

**Admins:** emails in `private.settings.admin_emails` become admins on sign-up.

## Campus launch (Oct 2026)

Grow campus by campus with verified students (`00030_campuses.sql`, `/campus`, `lib/campus/`).

- **Verify:** sign in with a university email (free, instant), or get a 6-digit code emailed to one
  (`POST /api/campus/code` → `/api/campus/confirm`). Codes: 15 min, 1 per minute, 5 per day,
  5 wrong tries. One student email verifies one account; we store a peppered SHA-256 of it, never the
  address. Only accounts with a server-checked 18+ date of birth can verify.
- **Email domains** match the domain and any subdomain (`uonbi.ac.ke` covers `students.uonbi.ac.ke`).
  Confirm each university's student domain before marketing there:
  `update public.campuses set email_domains = array['...'] where slug = '...';`
- **Opening:** a campus is `waitlist` until `unlock_target` students verify, then it opens by itself and
  every verified student there is notified. The Campus race board shows real counts only.
  Open or close by hand: `update public.campuses set status = 'live' where slug = 'uon';`
- **Campus deck:** Discover's "<campus> only" chip (`/api/discover?campus=<slug>`) is for verified
  students of an open campus; anyone else gets an empty deck, never the city deck.
- **Badge:** "🎓 UoN" on cards and profiles, on by default, members can hide it on `/campus`.
- **Email:** campus codes need `RESEND_API_KEY` and `EMAIL_FROM`. Without them, only the sign-in-email
  route works and the page says so.
- **Hide me from my campus** (`00031_hide_from_campus.sql`, free): hidden from other verified students
  at the same campus everywhere `profile_hidden_from_me` applies, except people they've already liked.
  While hidden, their own campus deck is off. It can't hide from classmates who never verified — the
  Campus page says so, and contact blocking still covers known numbers.
- **Comrade Gold** (`00032_comrade_gold.sql`): `comrade_week` KES 49 / `comrade_month` KES 199. Ordinary
  Gold once paid (same settlement and ledger). `products.requires_campus` + the `transactions` insert
  policy refuse it for anyone not in `campus_members`. Verified students see it on `/upgrade` in place of
  regular Gold; others in Kenya see a "Student? Verify your campus" link.
- Campus marketing never goes near schools or under-18s, and the paid-services rules apply on campus
  exactly as everywhere else.
