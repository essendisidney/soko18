import { ONBOARDING, readIntents, readShowMe } from "@/lib/onboarding";
import { impressedIds } from "@/lib/discovery/impressions";
import { DEFAULT_NEAR_AREA, readNearArea } from "@/lib/nairobi/near";

export function readDiscoverPrefs() {
  if (typeof window === "undefined") {
    return { intents: [] as string[], near: DEFAULT_NEAR_AREA, city: "nairobi", seen: [] as string[] };
  }
  return {
    intents: readIntents(),
    near: readNearArea(),
    city: localStorage.getItem(ONBOARDING.city) || "nairobi",
    seen: impressedIds(),
  };
}

export function discoverQuery() {
  const prefs = readDiscoverPrefs();
  const q = new URLSearchParams({ city: prefs.city, near: prefs.near, gender: readShowMe() });
  if (prefs.intents.length) q.set("intent", prefs.intents.join(","));
  if (prefs.seen.length) q.set("seen", prefs.seen.join(","));
  return q;
}
