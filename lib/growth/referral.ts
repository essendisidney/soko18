/**
 * Invite links. The code and the reward live in Supabase (public.claim_invite / my_invites);
 * this file only carries an incoming code from the link to sign-up.
 */

export const INVITE_COOKIE = "soko18_invite";
const PENDING_KEY = "soko18_invite_pending";

export function normalizePass(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function canRedeem(code: string, own: string): { ok: true } | { ok: false; reason: "invalid" | "self" } {
  const normalized = normalizePass(code);
  if (normalized.length < 4) return { ok: false, reason: "invalid" };
  if (own && normalized === normalizePass(own)) return { ok: false, reason: "self" };
  return { ok: true };
}

export function inviteUrl(origin: string, code: string) {
  return `${origin.replace(/\/$/, "")}/?invite=${encodeURIComponent(normalizePass(code))}`;
}

export function inviteMessage(origin: string, code: string) {
  return `I'm on SOKO — dating in Kenya with verified people and real privacy. Join with my link and get free Super Likes: ${inviteUrl(origin, code)}`;
}

export function whatsappInviteUrl(origin: string, code: string) {
  return `https://wa.me/?text=${encodeURIComponent(inviteMessage(origin, code))}`;
}

/** Remember a code from ?invite= until the visitor signs up. */
export function rememberInvite(raw: string) {
  if (typeof window === "undefined") return false;
  const code = normalizePass(raw);
  if (code.length < 4) return false;
  try {
    localStorage.setItem(PENDING_KEY, code);
  } catch {}
  document.cookie = `${INVITE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  return true;
}

export function pendingInvite() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
  document.cookie = `${INVITE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function hasFriendPass() {
  return Boolean(pendingInvite());
}
