const MAX = 200;

export function applyFlag(ids: string[], profileId: string, on: boolean): string[] {
  const next = ids.filter((id) => id !== profileId);
  if (on) next.unshift(profileId);
  return next.slice(0, MAX);
}

export function toggleFlag(ids: string[], profileId: string) {
  const on = !ids.includes(profileId);
  return { ids: applyFlag(ids, profileId, on), on };
}

export function hideBlocked<T extends { id: string }>(list: T[], blockedIds: Iterable<string>) {
  const hidden = new Set(blockedIds);
  return list.filter((item) => !hidden.has(item.id));
}
