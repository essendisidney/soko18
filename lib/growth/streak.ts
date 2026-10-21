/** Daily check-in: at most one call per device per Nairobi day. */
export const CHECK_IN_KEY = "kutana_checked_in";

export function nairobiDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(now);
}

export type CheckIn = { days: number; every: number; gift: boolean };

/** What to say after checking in. Quiet unless it's a gift or one day off a gift. */
export function streakLine(result: CheckIn | null): string | null {
  if (!result || result.days < 2) return null;
  if (result.gift) return `${result.days} days in a row 🔥 A free Super Like is yours.`;
  const left = result.every - (result.days % result.every);
  if (left === 1) return `${result.days} days in a row 🔥 Come back tomorrow for a free Super Like.`;
  return null;
}
