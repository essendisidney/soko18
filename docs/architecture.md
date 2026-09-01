# architecture.md

We are using React Native for the frontend, Node.js + Express for the backend, MongoDB for the database, and Socket.io for real-time chat.

## Frontend

- React Native
- Main experience is a swipeable card feed
- Cards pull profile data from the REST API
- Like and pass gestures on each card
- After a mutual like, open real-time chat

## Backend

- Node.js + Express
- REST API
- User registration, login, JWT authentication
- Swipe (like / pass) logic
- Profile CRUD
- In-app reporting
- Emergency panic button: send the user’s location to a pre-set emergency contact

## Data

- MongoDB
- Users, profiles, swipes, matches, messages, reports, emergency contacts, subscriptions, boosts

## Realtime

- Socket.io
- Users who have mutually liked each other can send and receive messages instantly

## Payments

- Currency: integer KES
- Rail: M-Pesa Daraja STK Push (sandbox until shortcode + KYC)
- Catalog: Basic 5,000/mo, Premium 10,000/mo, Boost 500/24h, Spotlight 1,200/4h, Featured 3,500/7d, Spotlight+Boost 1,500, Incognito 1,500/mo, Skip the line 5,000, Mystery 200, Golden Hour 500 (8–9pm EAT pin), Safety pack 1,000/mo
- Optional coins after STK works (KES 1,000 = 100 coins). Invites do not mint credit.
- No booking commission
- Every charge: payment → transaction → ledger → receipt
- Anonymity: incognito, hashed contacts, 24-hour chats — see `docs/anonymity.md`

## Safety (the product you sell)

- ID verification both sides
- Two-way ratings
- Panic + live location to a pre-set emergency contact only
- Chat after a match, read receipts, report
@ this file with `docs/contracts.md`, `docs/ui-design.md`, `docs/business-model.md`, and `docs/anonymity.md` before generating payments, swipe, chat, or safety.

