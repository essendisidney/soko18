/**
 * Question of the week: one Kenyan prompt everyone answers, for WhatsApp Status, TikTok street
 * interviews and campus groups. Only the light categories, never "Mapenzi", so it's safe to post
 * anywhere and doesn't read as a dating ad.
 */
import { PROMPT_CATEGORIES } from "@/lib/profile/prompts";

const PUBLIC_CATEGORIES = new Set(["mtaani", "chakula", "vibes", "games"]);

export const PUBLIC_QUESTIONS = PROMPT_CATEGORIES.filter((c) => PUBLIC_CATEGORIES.has(c.id)).flatMap((c) =>
  c.prompts.map((p) => p.q),
);

const WEEK = 7 * 24 * 60 * 60 * 1000;
// Weeks start on Monday 00:00 Nairobi time (Sunday 21:00 UTC).
const EPOCH = Date.UTC(2026, 0, 4, 21);

export function weekNumber(now = Date.now()) {
  return Math.floor((now - EPOCH) / WEEK);
}

/** Same question for everyone all week, a new one every Monday. */
export function questionOfTheWeek(now = Date.now()) {
  const n = weekNumber(now);
  const i = ((n % PUBLIC_QUESTIONS.length) + PUBLIC_QUESTIONS.length) % PUBLIC_QUESTIONS.length;
  return PUBLIC_QUESTIONS[i];
}

/** Flash cards for street interviews: this week's question first, then the rest in a fixed order. */
export function questionDeck(now = Date.now()) {
  const first = questionOfTheWeek(now);
  return [first, ...PUBLIC_QUESTIONS.filter((q) => q !== first)];
}
