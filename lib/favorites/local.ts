import { applyFlag } from "@/lib/safety/flags";
import { readLocalIds, snapshotLocalIds, subscribeLocalIds, writeLocalIds } from "@/lib/safety/local-ids";

export const FAVORITES_KEY = "soko18_favorites";

export function subscribeFavorites(onChange: () => void) {
  return subscribeLocalIds(FAVORITES_KEY, onChange);
}

export function favoritesSnapshot() {
  return snapshotLocalIds(FAVORITES_KEY);
}

export function readFavorites() {
  return readLocalIds(FAVORITES_KEY);
}

export function writeFavorite(profileId: string, saved: boolean) {
  writeLocalIds(FAVORITES_KEY, applyFlag(readFavorites(), profileId, saved));
}

export function isFavorite(profileId: string) {
  return readFavorites().includes(profileId);
}
