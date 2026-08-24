# SOKO18

Nairobi-first 18+ local discovery. **Discover. Connect. Verify.**

Not African Tinder. Not a classifieds site. Density in Nairobi before anywhere else.

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

Git → Vercel. No Supabase env vars needed yet.

The product runs on seed data until a paid Supabase project is connected. Discover is a ranked swipe deck. Guest can pass; Like and Message ask you to sign in. Photos stay in review until approved.
