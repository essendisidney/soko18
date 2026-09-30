# SOKO18

Nairobi-first 18+ dating. **Discover. Connect. Verify.**

Verified-only, M-Pesa-native, area by area. Read `docs/PIVOT.md` first.

This repo is built from `docs/SOKO18_MASTER_DEVELOPMENT.md`.

## Stack

Next.js · TypeScript · Tailwind · shadcn primitives · Supabase · Vercel

## Local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You must be 18+.

PWA: install from the browser once the manifest is served (`/manifest.webmanifest`).

## Deploy

Production: [https://soko18.vercel.app](https://soko18.vercel.app)

Git → Vercel. Set `NEXT_PUBLIC_APP_URL` to the public origin. Leave Supabase env blank until a paid project exists — never put `service_role` in `NEXT_PUBLIC_` vars.

Payments: Gold, Platinum, Boost, Super Likes and Incognito by M-Pesa STK — see `docs/PIVOT.md`. Set `MPESA_*` (including `MPESA_CALLBACK_SECRET`) and turn sandbox off in `private.settings` to go live.

Health: `/api/health`. Schema backups are `supabase/migrations/` in git. Point-in-time recovery waits for a paid Supabase project.

The product runs on seed data until that project is connected. Discover is a ranked swipe deck. Guest can pass; Like and Message ask you to sign in. Photos stay in review until approved. Legal: `/terms`, `/privacy`, `/safety`.
