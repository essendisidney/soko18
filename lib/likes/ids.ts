/** Seed profiles that already liked the signed-in seeker. Amani only — others are one-way. */
export const SEED_INBOUND_IDS = new Set(["p1"]);

export function seedAccountId(profileId: string) {
  return `seed:${profileId}`;
}

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
