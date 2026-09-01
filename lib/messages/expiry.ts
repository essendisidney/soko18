export const CHAT_TTL_MS = 24 * 60 * 60 * 1000;

export function chatExpiresAt(openedAt: string, now = openedAt) {
  const start = Date.parse(openedAt);
  if (Number.isNaN(start)) return now;
  return new Date(start + CHAT_TTL_MS).toISOString();
}

export function chatOpen(expiresAt: string, now: string) {
  return Date.parse(now) < Date.parse(expiresAt);
}

export function extendChat(now: string) {
  return new Date(Date.parse(now) + CHAT_TTL_MS).toISOString();
}

export function remainingLabel(expiresAt: string, now: string) {
  const ms = Date.parse(expiresAt) - Date.parse(now);
  if (ms <= 0) return "Ended";
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${mins}m left`;
  return `${Math.max(1, mins)}m left`;
}
