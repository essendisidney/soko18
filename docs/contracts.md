# contracts.md

Create a RESTful API for user profiles with fields: `id`, `name`, `age`, `location`, `photos`, `serviceType`, and `hourlyRate`.

## Auth

- `POST /auth/register` — email/phone + password, 18+ only
- `POST /auth/login` — returns JWT
- Protected routes require `Authorization: Bearer <token>`

## Profiles

```
id
name
age
location
photos
serviceType
hourlyRate
```

- `GET /profiles` — feed for the swipe screen (filter by location / distance)
- `GET /profiles/:id` — one profile
- `POST /profiles` — create (auth)
- `PATCH /profiles/:id` — update own profile (auth)

## Swiping

- `POST /swipes` — `{ targetId, action: "like" | "pass" }`
- Mutual like creates a match and opens chat

## Chat

- Socket.io after a mutual like
- `GET /matches` — list matches
- Messages only between matched users

## Safety

- `POST /reports` — in-app report on a profile or thread
- Panic button: send the user’s current location to a pre-set emergency contact
- `PUT /safety/emergency-contact` — set that contact
- `POST /safety/panic` — fire location to that contact

## Money (see `docs/business-model.md`)

- `POST /payments/stk` — Daraja STK Push. Body: `phone`, `amountKes`, `purpose`
- Basic **KES 5,000**/mo · Premium **KES 10,000**/mo
- Boost **500**/24h · Spotlight **1,200**/4h · Featured **3,500**/7d · bundle **1,500**
- Incognito **1,500**/mo · Skip the line **5,000** · Mystery **200** · Golden Hour **500** · Safety pack **1,000**/mo
- Coins later: KES 1,000 = 100 coins; Boost 50; Spotlight 120
- Never a booking cut. Never a paid flag without a ledger row. Never a fake waitlist count

## Anonymity (see `docs/anonymity.md`)

- Incognito: hidden unless you like first. Unmask extra photos after both IDs
- `PUT /privacy/contacts` — hashed numbers only
- Chats expire 24h; `POST /messages/:id/extend`
- `POST /matches/mystery` — KES 200, ledger required

## Safety (what the subscription is for)

- ID verification both sides
- `POST /ratings` — two-way, match required. Never invent a 4.8
- Report. One hides from your Discover. Three unique reporters → staff review
- `PUT /safety/emergency-contact`
- `POST /safety/panic` — `{ lat, lng }` to that contact only
- Chat: read receipts + report

