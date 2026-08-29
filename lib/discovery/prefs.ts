import { ONBOARDING, readIntents } from "@/lib/onboarding";
import { impressedIds } from "@/lib/discovery/impressions";
import { DEFAULT_NEAR_AREA } from "@/lib/nairobi/near";

export function readDiscoverPrefs() {
  if (typeof window === "undefined") {
    return { intents: [] as string[], near: DEFAULT_NEAR_AREA, seen: [] as string[] };
  }
  return {
    intents: readIntents(),
    near: localStorage.getItem(ONBOARDING.nearArea) || DEFAULT_NEAR_AREA,
    seen: impressedIds(),
  };
}

export function discoverQuery() {
  const prefs = readDiscoverPrefs();
  const q = new URLSearchParams({ city: "nairobi", near: prefs.near });
  if (prefs.intents.length) q.set("intent", prefs.intents.join(","));
  if (prefs.seen.length) q.set("seen", prefs.seen.join(","));
  return q;
}
