# Kutana — next build (K-phases)

Written 23 Oct 2026. Read `docs/PIVOT.md` first; its **Hard rules still win** over anything here.
This file adds the features that make Kutana different from every other swipe app and ready for
Africa. Build the phases in order. After each phase: migrations numbered from `00030_`, Vitest +
Playwright (390px) + pgTAP where RLS changes, update `docs/PHASE_STATUS.md`, commit.

## Ground rules for this build

- Kutana stays a dating app. No feeds, marketplaces, hustle boards or networking tabs.
- Never move money between members, never sell anything one member gives another (PIVOT hard rule 1).
- Every paid thing is a `public.products` SKU with `product_prices` per market and a ledger row.
- Never invent counts. Empty stays empty.
- Copy in EN / SW / FR plus the new locales below. No escort / sponsor / rates language.
- Keep the PWA light: check bundle size and image weight on every phase.
- Check what already exists before building (selfie verify, Incognito, live share, panic,
  Looking for, message-before-match, web push, markets). Extend it; don't duplicate it.

## K1 — Trust that only Kutana has

1. **Age bands for students and older members.**
   - DOB 18+ already exists. Add an optional student flag, verified by a `.ac.ke` (and later
     other countries' university domains) email code. Student badge only after the code.
   - Default "Show me" age range: members aged 18–25 default to ±4 years from their age.
   - A member aged 30+ can only appear to an 18–25 member if that younger member has widened
     their own range to include them. Enforce in the discover query and in RLS, not just the UI.
   - Platinum message-before-match and Salamu (K2) cannot be sent by a 30+ member to an
     18–25 member.
   - Flag for staff review: any account that likes or messages many members 10+ years younger
     in a short window. Add it to `/admin/queue`.
2. **Jina check (mobile-money name match).**
   - First confirm what the live IntaSend and Daraja callbacks actually return for the payer
     name. Write the finding into this file. If no reliable name comes back, build nothing here,
     say so in PHASE_STATUS, and leave the selfie + ID path as the verification.
   - If a name does come back: member pays a tiny verification SKU (`jina_check`, KES 10).
     Compare the returned name to the profile first name (fuzzy, case- and accent-insensitive).
     Match → "Jina limethibitishwa" badge. Store only match yes/no and a date, never the
     returned name or the phone number beyond what payments already keep.
   - **Finding (23 Oct 2026, K1): no reliable payer name comes back, so nothing is built.**
     IntaSend's collection webhook and status call return invoice_id, state, provider, value,
     currency, account (phone/email), api_ref, charges and failure fields, with no payer name
     (developers.intasend.com/docs/payment-collection-events). The first_name/last_name in
     their STK example is what *we* send, not a confirmed M-Pesa name. Daraja's STK callback
     returns Amount, MpesaReceiptNumber, TransactionDate and PhoneNumber only. Selfie + ID stays
     the verification. Revisit if IntaSend confirms a registered-name field, checked on a real
     payment first.
3. **Rafiki vouches.**
   - A verified member can vouch for another member they know (max 5 given, shown up to 3).
   - Vouches show on the profile as "Vouched by 2 friends" with first names only.
   - A vouch is withdrawn automatically if the voucher is banned. Staff can see vouch chains
     when reviewing reports (ring detection: many vouches between new accounts).

## K2 — The daily experience

1. **Daily drop.**
   - Alongside the normal deck, each member gets a small curated set (default 7) at 20:00 in
     their market's clock. Ranked from intent, age band, area, mutual vouches and activity.
   - Drop cards expire at the next drop. Gold sees 3 extra. Push at drop time ("Your 7 are in").
   - Never pad the drop with seed or inactive people. A thin market gets a smaller drop.
2. **Voice intros.**
   - A 15-second voice clip on the profile, recorded in-app, any language.
   - Compress hard (Opus, mono, low bitrate). Goes through the staff review queue and the
     paid-services filter (transcribe if a cheap option exists; otherwise staff review).
   - Profiles with a voice intro rank slightly higher in the drop.
3. **Salamu (pay-per-first-message).**
   - New consumable SKUs: `salamu_1` KES 20, `salamu_5` KES 79 (set per market in
     `product_prices`). Sends one message to someone you haven't matched with.
   - Reuse the message-before-match plumbing (it becomes the first message on match).
   - Recipient can ignore, reply (creates the conversation) or block. Rate-limit per sender.
   - Age-band rule from K1 applies.
4. **Richer "Looking for".**
   - Keep relationship / casual / friends / not sure. Add optional tags: marriage-minded,
     faith matters to me, wants kids, open to relocating, open to long distance.
   - Do **not** add tribe or ethnicity fields or filters. Add a test that fails if one appears.
   - Treat faith as sensitive data: covered by the existing sensitive-data consent, optional,
     never shown unless the member chooses to show it.
5. **African prompts.** Replace generic prompts with local ones in each locale
   (e.g. "My go-to nyama choma order", "Jollof or pilau — defend it", "Best matatu route").
   Prompts still pass the paid-services filter.

## K3 — Safety for the way people actually meet

1. **Date plan + check-in.** Extend live share: member enters where/when, picks a trusted
   contact, sets a check-in time. Missed check-in → SMS/push to the contact with the plan.
   One tap "I'm safe" closes it. Free for everyone.
2. **Scam guard.** Like the paid-services filter, detect early money asks in chat (M-Pesa
   numbers, "send fare", "lend me", gift-card and crypto asks, moving to WhatsApp in the first
   messages). Show the recipient a calm in-thread warning, hold repeat offenders for review.
   Log only the flag, not the message text, outside the thread.
3. **Discreet mode.**
   - App PIN lock (device-local), quick-exit button that jumps to a neutral page,
     notifications that never show names or message text (push already hides names — keep it).
   - Offer a neutral install option: a second web manifest with a generic name and icon that
     members can choose before "Add to Home Screen". Check what iOS/Android PWA installs allow
     and document the limits honestly in Settings.

## K4 — Built for African phones and markets

1. **Data saver.** Setting (on by default when `navigator.connection.saveData` or a 2G/3G
   effective type is detected): small blurred photo thumbnails until tapped, no autoplay voice,
   lighter deck prefetch. Show "Today: 1.2 MB used" in Settings from a local counter.
2. **SMS backup alerts.** For matches, Salamu and date check-ins only. Use the cheapest Kenyan
   SMS route that fits (compare Africa's Talking and others; least-cost wins). No names or
   message text in the SMS. Daily cap per member. Opt-out in Settings. Skip SMS when a push
   was delivered in the last few minutes.
3. **More languages.** Add Sheng (as a Kenya-only variant of Kiswahili), Nigerian Pidgin and
   Amharic to the existing i18n. Keep strings short. Add a test that every key exists in every
   locale.
4. **Diaspora — Home & Away.**
   - Members in GB/US (and later Gulf/EU markets) can set a "home" country and choose to be
     shown to members there, and the reverse for home members who opt in.
   - Priced in the member's own market currency through `product_prices` (e.g. a
     `home_away_month` SKU). Never sum currencies.
   - Distance and area labels become "Lives in London · from Nairobi".
5. **Coming Home travel mode.** A member sets a city and dates (e.g. 15 Dec–5 Jan, Nairobi).
   From 14 days before arrival they can appear in that city's deck and drop, labelled
   "Visiting from London, 15 Dec". Paid SKU per trip or included in Home & Away.
6. **Market readiness.** For each waitlist market, keep a checklist in this file: payment rail,
   local price review, data-protection registration, language, legal review of relationship
   laws. Do not switch a market to `live` from code.

## K5 — Gifts (in-app only)

- A member can gift a match a Kutana perk: a Super Like pack, a Boost, or a Gold week.
  The giver pays Kutana; the recipient receives an entitlement. Nothing is cash, airtime or
  transferable, and nothing can be resold or refunded to the recipient (PIVOT hard rule 1).
- Gifting only after a match. Cap per sender per week. Recipients can decline.
- No airtime or data-bundle transfers between members — that would be moving value between
  members. Revisit only with a legal opinion.

## K6 — Kutana Spots (after traction)

- Partner venues near campuses and estates pay Kutana a listing fee (venue SKU, invoiced to the
  venue, never to members). Members see "Good first-date spots near Kilimani" in the date plan.
- No booking cut, no member payments to venues through Kutana.
- Squads / group meetups wait until Spots proves out.

## Ops (not code — track here, don't build)

- ODPC registration as data controller and processor (Kenya), then each market's regulator.
- Campus ambassador launch per university: UoN, KU, Strathmore, USIU, JKUAT first.
- City order after Nairobi: Kampala, Dar es Salaam, Kigali, then Lagos and Accra (diaspora-led).

## K0 — Pricing update (do this before K1)

Update `public.products`, `product_prices` (KE) and `lib/payments/catalog.ts` together, plus the
paywall/Studio copy and tests. Prices are VAT-inclusive shelf prices.

| SKU | KES | Change |
|---|---|---|
| gold_day (new) | 39 | Gold for 24h. "Friday night pass". |
| gold_week | 149 | unchanged |
| gold_month | 499 | unchanged |
| gold_week_student (new) | 99 | Only for members with the verified student badge (K1). Server-checked. |
| platinum_month | 1,299 | was 999 |
| boost_1 / boost_5 | 99 / 399 | unchanged |
| super_1 / super_5 | 49 / 199 | unchanged |
| incognito_month | 299 | unchanged |
| salamu_1 / salamu_5 (K2) | 59 / 249 | must stay above a Super Like |
| jina_check | — | **no SKU**. The K1 name check runs on a member's first purchase of anything. |
| home_away_month (K4) | GBP 9.99 / USD 12.99 | diaspora markets only, priced in their currency |
| coming_home_trip (K4) | GBP 14.99 / USD 19.99 | per trip, or included in Home & Away |
| gift_* (K5) | same as the perk | no discount |

- Existing Platinum buyers keep 999 until their current period ends. No auto-renew anyway.
- Other markets: set `product_prices` by local buying power, not FX conversion. Draft only.
- **Credits (only if fees demand it):** first record IntaSend's real fee on KES 39–59
  payments in this file. If fees take more than ~10%, add non-refundable, non-transferable
  Kutana credits (top-up KES 200 / 500, spend on consumables). Do not ship credits until the
  owner confirms a legal check on stored value.

## K7 — Owner economics page

Add `/admin/economics` (admin only):
- Monthly revenue from ledger by market and currency (never summed across currencies), net of
  recorded payment fees.
- Paying members this month, ARPPU, paying share of monthly actives.
- Monthly costs entered by the admin (hosting, moderation, SMS, marketing, other) stored in
  `private.settings` or a small `admin_costs` table.
- Break-even: paying members needed = costs ÷ net ARPPU; MAU needed at the current paying
  share. Show actual vs needed. Real numbers only — empty until ledger rows exist.

## Launch checklist (go-live gate — owner decides each item)

Code (Claude Code can do):
- [ ] K0–K5 and K7 built, all tests green, `npm run build` clean.
- [ ] Every "SOKO18" string the member can see says Kutana (migration 00027 started this).
- [ ] Seed/test profiles (00024/00025) hidden from production decks and counts.
- [ ] Error monitoring on API routes; `/api/health` checked by an uptime monitor (free tier).
- [ ] Load test discover, likes and messages at 1,000 concurrent members on the paid project.

Owner only (Claude Code must stop and ask):
- [ ] Paid Supabase project live, migrations applied, PITR backups on.
- [ ] Vercel plan that allows commercial use; custom domain on.
- [ ] IntaSend live account + KYC done; one real KES 39 payment settles end to end.
- [ ] `payments_sandbox` turned off.
- [ ] ODPC registration as data controller/processor.
- [ ] Moderator hired and trained on `/admin/queue`; response target under 2 hours.
- [ ] SMS provider chosen (least cost).
- [ ] KRA: VAT position decided (shelf prices are VAT-inclusive).
- [ ] 50–100 real verified members (at least 40% women) at the first campus before opening.
