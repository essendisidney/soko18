const PEPPER = "soko18:contact:v1";

export function normalizeKePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  return null;
}

export async function hashContact(raw: string) {
  const phone = normalizeKePhone(raw);
  if (!phone) return null;
  const bytes = new TextEncoder().encode(`${PEPPER}:${phone}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function blockedByHash(profileHash: string | null | undefined, blocked: Iterable<string>) {
  if (!profileHash) return false;
  const set = new Set(blocked);
  return set.has(profileHash);
}
