export function requestedProfileAllowed(requestedId: string | null, ownProfileId: string | null) {
  if (!ownProfileId) return requestedId == null;
  if (!requestedId) return true;
  return requestedId === ownProfileId;
}

export function formatDelta(current: number, previous: number | null) {
  if (previous == null || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return `↑ ${pct}%`;
  if (pct < 0) return `↓ ${Math.abs(pct)}%`;
  return null;
}
