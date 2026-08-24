const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach((listen) => listen());
}

export function subscribeLocalIds(key: string, onChange: () => void) {
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(onChange);
  listeners.set(key, set);
  function handle(event: StorageEvent) {
    if (event.key === key) onChange();
  }
  window.addEventListener("storage", handle);
  return () => {
    set.delete(onChange);
    window.removeEventListener("storage", handle);
  };
}

export function snapshotLocalIds(key: string) {
  return localStorage.getItem(key);
}

export function parseIdList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { ids?: string[] } | string[];
    return Array.isArray(parsed) ? parsed : (parsed.ids ?? []);
  } catch {
    return [];
  }
}

export function readLocalIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  return parseIdList(localStorage.getItem(key));
}

export function writeLocalIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify({ ids }));
  emit(key);
}
