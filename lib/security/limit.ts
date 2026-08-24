import { allowRate, RATE_LIMITS, rateLimitError, type RateBucket } from "@/lib/security/rate-limit";

const hits = new Map<string, number[]>();

export function clientKey(request: Request, userId?: string | null) {
  if (userId) return userId;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anon";
}

export function takeRateLimit(bucket: RateBucket, key: string, now = Date.now()) {
  const id = `${bucket}:${key}`;
  const result = allowRate(hits.get(id) ?? [], now, RATE_LIMITS[bucket]);
  hits.set(id, result.hits);
  if (!result.ok) return rateLimitError(result.retryAfterSec);
  return { ok: true as const };
}
