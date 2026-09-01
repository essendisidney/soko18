export function recordExtendTap(votes: string[], tapperId: string) {
  if (!tapperId || votes.includes(tapperId)) return votes;
  return [...votes, tapperId];
}

export function extendReady(votes: Iterable<string>, a: string, b: string) {
  const set = new Set(votes);
  return Boolean(a && b && set.has(a) && set.has(b));
}
