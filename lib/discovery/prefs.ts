import { ONBOARDING } from "@/lib/onboarding";
import { excludedProfileIds } from "@/lib/discovery/actions";
import { impressedIds } from "@/lib/discovery/impressions";
import { DEFAULT_NEAR_AREA } from "@/lib/nairobi/near";

export function readDiscoverPrefs() {
  if (typeof window === "undefined") {
    return { intents: [] as string[], near: DEFAULT_NEAR_AREA, exclude: [] as string[], seen: [] as string[] };
  }
  return {
    intents: (localStorage.getItem(ONBOARDING.intent) ?? "").split(",").filter(Boolean),
    near: localStorage.getItem(ONBOARDING.nearArea) || DEFAULT_NEAR_AREA,
    exclude: excludedProfileIds(),
    seen: impressedIds(),
  };
}

export function discoverQuery() {
  const prefs = readDiscoverPrefs();
  const q = new URLSearchParams({ city: "nairobi", near: prefs.near });
  if (prefs.intents.length) q.set("intent", prefs.intents.join(","));
  if (prefs.exclude.length) q.set("exclude", prefs.exclude.join(","));
  if (prefs.seen.length) q.set("seen", prefs.seen.join(","));
  return q;
}
