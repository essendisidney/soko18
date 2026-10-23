/**
 * Discreet mode lives on this device only: an app PIN, a quick-exit button and a neutral home
 * screen icon. Nothing here is sent to Kutana. The PIN is stored as a salted SHA-256 hash.
 */

export const DISCREET_KEY = "kutana_discreet";
export const UNLOCKED_KEY = "kutana_unlocked_at";
/** Lock again after the app has been in the background this long. */
export const RELOCK_MS = 60_000;
export const PIN_TRIES = 5;
export const PIN_WAIT_MS = 30_000;
export const QUICK_EXIT_URL = "https://www.google.com/search?q=weather";

export type Discreet = { pinHash?: string; salt?: string; pinLength?: number; quickExit?: boolean; neutralIcon?: boolean };

export function readDiscreet(): Discreet {
  if (typeof window === "undefined") return {};
  try {
    return (JSON.parse(localStorage.getItem(DISCREET_KEY) ?? "{}") as Discreet) ?? {};
  } catch {
    return {};
  }
}

export function writeDiscreet(next: Discreet) {
  localStorage.setItem(DISCREET_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("kutana-discreet"));
}

/** A PIN is 4 to 6 digits. */
export function validPin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export async function hashPin(pin: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkPin(pin: string, settings: Discreet) {
  if (!settings.pinHash || !settings.salt) return true;
  return (await hashPin(pin, settings.salt)) === settings.pinHash;
}

/** Locked when a PIN is set and the app hasn't been unlocked recently. */
export function shouldLock(settings: Discreet, unlockedAt: number | null, now = Date.now()) {
  if (!settings.pinHash) return false;
  if (!unlockedAt) return true;
  return now - unlockedAt > RELOCK_MS;
}
