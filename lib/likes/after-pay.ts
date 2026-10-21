/**
 * The like someone was making when they hit a paywall. Once they've paid for something that
 * covers it, we send it for them, so paying never means finding that person again.
 */
import { PRODUCTS, type Sku } from "@/lib/payments/catalog";

const KEY = "kutana_like_after_pay";
const MAX_AGE_MS = 30 * 60 * 1000;

export type LikeAfterPay = {
  profileId: string;
  name: string;
  kind: "like" | "super";
  /** Why it was stopped: out of free likes, or out of Super Likes. */
  code: "like_limit" | "no_super_likes";
  at: number;
};

export function rememberLikeAfterPay(row: Omit<LikeAfterPay, "at">, now = Date.now()) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...row, at: now }));
  } catch {}
}

export function forgetLikeAfterPay() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function parseLikeAfterPay(raw: string | null, now = Date.now()): LikeAfterPay | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as Partial<LikeAfterPay>;
    if (typeof row.profileId !== "string" || typeof row.at !== "number") return null;
    if (row.kind !== "like" && row.kind !== "super") return null;
    if (row.code !== "like_limit" && row.code !== "no_super_likes") return null;
    if (now - row.at > MAX_AGE_MS || row.at > now + 60_000) return null;
    return { profileId: row.profileId, name: typeof row.name === "string" ? row.name : "", kind: row.kind, code: row.code, at: row.at };
  } catch {
    return null;
  }
}

/** Does buying this unblock that like? Plans lift the daily limit (and come with Super Likes). */
export function purchaseCovers(sku: Sku, row: Pick<LikeAfterPay, "code">) {
  const product = PRODUCTS[sku];
  if (product.kind === "plan") return true;
  return row.code === "no_super_likes" && product.kind === "super_like";
}

/** Take the waiting like if this purchase covers it. */
export function takeLikeAfterPay(sku: Sku, now = Date.now()): LikeAfterPay | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  const row = parseLikeAfterPay(raw, now);
  if (!row) {
    forgetLikeAfterPay();
    return null;
  }
  if (!purchaseCovers(sku, row)) return null;
  forgetLikeAfterPay();
  return row;
}

/** After a confirmed payment: send the like that was waiting, and say so. */
export async function sendLikeAfterPay(sku: Sku): Promise<string | null> {
  const row = takeLikeAfterPay(sku);
  if (!row) return null;
  const { postLike } = await import("@/lib/likes/client");
  const result = await postLike(row.profileId, row.kind).catch(() => null);
  const who = row.name || "them";
  if (!result?.ok) return null;
  if (result.data.isNew) return `It’s a match with ${who}! 🎉`;
  return row.kind === "super" ? `Your Super Like to ${who} was sent ⭐` : `Your like to ${who} was sent ♥`;
}
