/** Which deck Discover shows: everyone nearby (null) or one campus (its slug). Saved on this device. */

const KEY = "kutana_campus_deck";
const listeners = new Set<() => void>();

export function readCampusDeck(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeCampusDeck(slug: string | null) {
  try {
    if (slug) localStorage.setItem(KEY, slug);
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((listen) => listen());
}

export function subscribeCampusDeck(onChange: () => void) {
  listeners.add(onChange);
  function handle(event: StorageEvent) {
    if (event.key === KEY) onChange();
  }
  window.addEventListener("storage", handle);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handle);
  };
}
