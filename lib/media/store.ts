import type { MediaItem, ModerationLog } from "@/lib/media/types";

export const MEDIA_KEY = "soko18_media";
export const MEDIA_LOG_KEY = "soko18_moderation_log";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listen) => listen());
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readMediaQueue(): MediaItem[] {
  return readJson<MediaItem[]>(MEDIA_KEY, []);
}

export function readModerationLog(): ModerationLog[] {
  return readJson<ModerationLog[]>(MEDIA_LOG_KEY, []);
}

export function writeMediaQueue(items: MediaItem[]) {
  localStorage.setItem(MEDIA_KEY, JSON.stringify(items));
  emit();
}

export function upsertMedia(item: MediaItem) {
  const items = readMediaQueue();
  const next = items.some((row) => row.id === item.id)
    ? items.map((row) => (row.id === item.id ? item : row))
    : [...items, item];
  writeMediaQueue(next);
}

export function appendModerationLog(entry: ModerationLog) {
  const log = readModerationLog();
  localStorage.setItem(MEDIA_LOG_KEY, JSON.stringify([entry, ...log]));
  emit();
}

export function subscribeMedia(onChange: () => void) {
  listeners.add(onChange);
  function handle(event: StorageEvent) {
    if (event.key === MEDIA_KEY || event.key === MEDIA_LOG_KEY) onChange();
  }
  window.addEventListener("storage", handle);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handle);
  };
}

export function mediaSnapshot() {
  return JSON.stringify({
    media: localStorage.getItem(MEDIA_KEY),
    log: localStorage.getItem(MEDIA_LOG_KEY),
  });
}

export function pendingQueue() {
  return readMediaQueue().filter((item) => item.status === "pending_review" || item.status === "scanning");
}
