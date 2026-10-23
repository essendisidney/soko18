/** Daily drop types and helpers that are safe in the browser. */

export type DropPick = {
  profileId: string;
  slug: string;
  name: string;
  age: number | null;
  area: string;
  verified: boolean;
  lookingFor: string | null;
  acted: boolean;
  photo?: string | null;
};

export type MyDrop = { expiresAt: string | null; picks: DropPick[] };

/** Hours (rounded up) until the picks go, for "Here for 5 more hours". Null once gone. */
export function hoursLeft(expiresAt: string | null, now = Date.now()) {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt) - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.ceil(ms / 3_600_000);
}
