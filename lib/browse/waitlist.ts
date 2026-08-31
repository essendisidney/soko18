export const WAITLIST_KEY = "soko18_city_waitlist";
export const WAITLIST_EVENT = "soko18-waitlist";

export function readWaitlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function subscribeWaitlist(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(WAITLIST_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(WAITLIST_EVENT, onChange);
  };
}

export function waitlistSnapshot() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WAITLIST_KEY);
}

function persistWaitlist(next: string[]) {
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(WAITLIST_EVENT));
}

export function joinWaitlist(slug: string) {
  persistWaitlist([...new Set([...readWaitlist(), slug])]);
  localStorage.setItem("soko18_waitlist_city", slug);
}

export function dropWaitlist(slug: string) {
  persistWaitlist(readWaitlist().filter((city) => city !== slug));
  if (localStorage.getItem("soko18_waitlist_city") === slug) {
    localStorage.removeItem("soko18_waitlist_city");
  }
}

export function onWaitlist(slug: string) {
  return readWaitlist().includes(slug);
}
