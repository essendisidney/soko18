import { apiError } from "@/lib/profile/schema";

const PAID_KEYS = [
  "featured_until",
  "featuredUntil",
  "boost_until",
  "boostUntil",
  "spotlight_until",
  "spotlightUntil",
] as const;

export function rejectPaidFlags(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  if (PAID_KEYS.some((key) => body[key] != null && body[key] !== "")) {
    return apiError("forbidden", "Paid flags require a ledger row.", 403);
  }
  return null;
}
