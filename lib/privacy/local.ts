import { hasLocalAccess } from "@/lib/payments/access-local";

export const INCOGNITO_KEY = "soko18_incognito";
export const CONTACT_HASH_KEY = "soko18_contact_hashes";

export function readIncognito() {
  if (typeof window === "undefined") return false;
  if (!hasLocalAccess("incognito")) return false;
  return localStorage.getItem(INCOGNITO_KEY) === "1";
}

export function writeIncognito(on: boolean) {
  localStorage.setItem(INCOGNITO_KEY, on ? "1" : "0");
}

export function readContactHashes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTACT_HASH_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((row) => typeof row === "string") : [];
  } catch {
    return [];
  }
}

export function writeContactHashes(hashes: string[]) {
  const unique = [...new Set(hashes)].slice(0, 2000);
  localStorage.setItem(CONTACT_HASH_KEY, JSON.stringify(unique));
}
