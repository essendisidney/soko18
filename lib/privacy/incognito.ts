/** Hidden unless they already liked you. Incognito is not a public map. */
export function ghostVisible(incognito: boolean, theyLikedYou: boolean) {
  if (!incognito) return true;
  return theyLikedYou;
}

export function seedIncognitoIds(profiles: Array<{ id: string; incognito?: boolean }>) {
  return profiles.filter((row) => row.incognito).map((row) => row.id);
}

export function filterGhosts<T extends { id: string }>(
  profiles: T[],
  incognitoIds: Iterable<string>,
  likedYouIds: Iterable<string>,
) {
  const hidden = new Set(incognitoIds);
  const inbound = new Set(likedYouIds);
  return profiles.filter((row) => ghostVisible(hidden.has(row.id), inbound.has(row.id)));
}
