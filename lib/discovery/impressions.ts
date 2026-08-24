export type Impression = {
  profileId: string;
  surface: "discover" | "browse" | "profile";
  at: number;
};

export const IMPRESSIONS_KEY = "soko18_impressions";

export function readImpressions(): Impression[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(IMPRESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Impression[];
  } catch {
    return [];
  }
}

export function writeImpression(entry: Impression) {
  const list = readImpressions();
  if (list.some((row) => row.profileId === entry.profileId && row.surface === entry.surface)) {
    return;
  }
  localStorage.setItem(IMPRESSIONS_KEY, JSON.stringify([entry, ...list].slice(0, 400)));
}

export function impressedIds() {
  return [...new Set(readImpressions().map((row) => row.profileId))];
}
