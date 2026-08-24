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

export function joinWaitlist(slug: string) {
  const next = [...new Set([...readWaitlist(), slug])];
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(next));
  localStorage.setItem("soko18_waitlist_city", slug);
  window.dispatchEvent(new Event(WAITLIST_EVENT));
}

export function onWaitlist(slug: string) {
  return readWaitlist().includes(slug);
}
