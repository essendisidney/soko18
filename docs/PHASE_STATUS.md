# Phase status

Current phase: **02 Design system** is green. Auth waits for a paid Supabase project. Until then the Vercel app runs on seed data.

| Phase | Name | Status | Notes |
|---|---|---|---|
| 01 | Foundation | complete | |
| 02 | Design system | complete | Nairobi home, Active now, Nairobi Now, PWA manifest |
| 03 | Authentication | not_started | |
| 04–16 | | not_started | See MDD |

## Decisions

- **Nairobi first, not Kenya first.** Other cities are waitlist until Nairobi has liquidity (1k → 5k → 10k quality profiles).
- Presence is **area-level only**. No live GPS.
- Organic Nairobi Now is activity-ranked; paid Boost/Spotlight/Featured are labeled and cannot buy organic trending.
- Public profile indexing is **opt-in** (`indexPublic`). Sitemap respects it.
- Ship **PWA** before native stores.
- Seed counts are real seed density (16 Nairobi profiles), not fake 2,847. The 2,847 figure is the density *target*, not a lying KPI.
- Package name is `soko18`.
- **Ship now:** Git + Vercel, seed data, no Supabase required.
- **Supabase later:** when the project is paid. Then Phase 03 (auth) can start. Schema is already in `supabase/migrations/`.
