const PASS_KEY = "soko18_friend_pass";
const REDEEMED_KEY = "soko18_friend_redeemed";

function randomPass() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function normalizePass(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function ownFriendPass() {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(PASS_KEY);
  if (existing) return existing;
  const created = randomPass();
  localStorage.setItem(PASS_KEY, created);
  return created;
}

export function redeemedPass() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REDEEMED_KEY);
}

export function hasFriendPass() {
  return Boolean(redeemedPass());
}

export function canRedeem(code: string, own: string): { ok: true } | { ok: false; reason: "invalid" | "self" } {
  const normalized = normalizePass(code);
  if (normalized.length < 4) return { ok: false, reason: "invalid" };
  if (normalized === own) return { ok: false, reason: "self" };
  return { ok: true };
}

export function redeemFriendPass(raw: string): { ok: true } | { ok: false; reason: "invalid" | "self" } {
  const result = canRedeem(raw, ownFriendPass());
  if (!result.ok) return result;
  localStorage.setItem(REDEEMED_KEY, normalizePass(raw));
  return { ok: true };
}

export function friendPassUrl(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/onboarding/privacy?pass=${encodeURIComponent(code)}`;
}
