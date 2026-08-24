export type RateWindow = {
  limit: number;
  windowMs: number;
};

export const RATE_LIMITS = {
  likes: { limit: 40, windowMs: 10 * 60 * 1000 },
  messages: { limit: 30, windowMs: 10 * 60 * 1000 },
  reports: { limit: 8, windowMs: 60 * 60 * 1000 },
  uploads: { limit: 12, windowMs: 60 * 60 * 1000 },
} as const;

export type RateBucket = keyof typeof RATE_LIMITS;

export function allowRate(hits: number[], now: number, rule: RateWindow) {
  const kept = hits.filter((at) => now - at < rule.windowMs);
  if (kept.length >= rule.limit) {
    const oldest = kept[0] ?? now;
    return {
      ok: false as const,
      hits: kept,
      retryAfterSec: Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000)),
    };
  }
  return { ok: true as const, hits: [...kept, now], retryAfterSec: 0 };
}

export function rateLimitError(retryAfterSec: number) {
  return {
    ok: false as const,
    status: 429 as const,
    error: { code: "rate_limited", message: "Slow down. Try again shortly." },
    retryAfterSec,
  };
}
