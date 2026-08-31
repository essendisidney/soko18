import { applyFlag } from "@/lib/safety/flags";
import { readLocalIds, snapshotLocalIds, subscribeLocalIds, writeLocalIds } from "@/lib/safety/local-ids";
import { areaBySlug } from "@/lib/data/nairobi";
import { categoryBySlug } from "@/lib/browse/categories";
import { waitlistCity } from "@/lib/data/waitlist";

export const SEARCH_NOTIFY_KEY = "soko18_search_notify";

export function searchNotifyKey(query: string) {
  return query.trim().toLowerCase().slice(0, 80);
}

export function subscribeSearchNotify(onChange: () => void) {
  return subscribeLocalIds(SEARCH_NOTIFY_KEY, onChange);
}

export function searchNotifySnapshot() {
  return snapshotLocalIds(SEARCH_NOTIFY_KEY);
}

export function joinSearchNotify(query: string) {
  const key = searchNotifyKey(query);
  if (!key) return;
  writeLocalIds(SEARCH_NOTIFY_KEY, applyFlag(readLocalIds(SEARCH_NOTIFY_KEY), key, true));
}

export function dropSearchNotify(query: string) {
  const key = searchNotifyKey(query);
  if (!key) return;
  writeLocalIds(SEARCH_NOTIFY_KEY, applyFlag(readLocalIds(SEARCH_NOTIFY_KEY), key, false));
}

export function onSearchNotify(query: string) {
  const key = searchNotifyKey(query);
  return Boolean(key) && readLocalIds(SEARCH_NOTIFY_KEY).includes(key);
}

export function notifyLabel(key: string) {
  if (key.startsWith("area:")) {
    return areaBySlug(key.slice(5))?.name ?? key.slice(5);
  }
  if (key.startsWith("category:")) {
    return categoryBySlug(key.slice(9))?.name ?? key.slice(9);
  }
  if (key.startsWith("city:")) {
    return waitlistCity(key.slice(5))?.name ?? key.slice(5);
  }
  return key;
}
