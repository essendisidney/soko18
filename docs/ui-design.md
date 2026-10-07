# ui-design.md

Swipe cards, Tinder-style, built for Kenyan phones. Each card: photo, name, age, area, verified badge.

## Discover

- Right = like, left = pass, up = Super Like
- Header: city + active areas. Links: "See who likes you" and "Boost · Gold"
- When the free like cap is hit: inline card "Get Gold · from KES 149" / "Not now". Never a dead end
- Boosted profiles carry a BOOSTED tag and are capped per window
- Look (Oct 2026): full-bleed card with a gold ring when Boosted; name + age + verified tick, area/presence/campus chips, first prompt as a quote card, "Looking for" line. Actions sit in a frosted dock over the card's foot (Rewind · Pass · Super Like · Like). Dragging shows tilted LIKE / PASS / SUPER LIKE stamps and a gold or rose edge glow; the next card peeks behind. Arrow keys swipe on desktop. Header: mark, "Discover in <area>" (tap to change), Filters | Browse

## Onboarding

Date of birth (18+) → area → "What are you looking for?" + "Show me" (Women / Men / Everyone) → profile

## Upgrade (`/upgrade`)

- Current plan, likes left, Super Likes, Boosts, "Boost me now"
- Plans: Gold week, Gold month (most popular), Platinum
- Boosts, Super Likes, Incognito
- Pay with M-Pesa: enter number → STK prompt → poll until paid

## Likes you (`/likes`)

- Count free; faces on Gold. Super Likes first

## Safety (free, always)

- ID verification, report (incl. "Selling or asking for money"), block
- Panic and live share to trusted contacts only
- Tips: meet in public, tell a friend, never send money to a match

## Privacy

- First name or nickname, Incognito (paid or Platinum), block contacts by hashed number

## Prompts

- Kenyan prompt library in `lib/profile/prompts.ts`, grouped as Mtaani, Chakula, Mapenzi, Vibes and Games. Each prompt has an example answer, shown as the placeholder.
- Editor: Add a prompt (picker with category tabs), Surprise me (random unused prompt), swap, remove, 150-character counter. Up to 3.
- The first answered prompt is the quote card on Discover; all of them show on the profile. The chat icebreaker quotes it.
- Stored answers keep the question text, so never reword a live question. Add a new one instead.

## Live swipe night

- Free, weekly: Sundays 8–10pm Nairobi (`lib/live-night.ts`). Never a paid perk, never a fake "people online" count.
- Discover strip under the header: "Live swipe night · Sun 8pm" (or "starts in 2h 20m" on the day) with Remind me (weekly `.ics` from `/api/live-night/ics`, 15-minute alarm). During the night: pulsing LIVE with "ends in …".
- Push reminder at 7:45pm (`/api/cron/live-night`, Vercel Cron `45 16 * * 0` UTC) only to members who turned on push and said yes to news (latest `marketing` consent).
