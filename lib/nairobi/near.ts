import { areaBySlug } from "@/lib/data/nairobi";
import { ONBOARDING } from "@/lib/onboarding";

export const DEFAULT_NEAR_AREA = "kilimani";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listen) => listen());
}

export function subscribeNearArea(onChange: () => void) {
  listeners.add(onChange);
  function handle(event: StorageEvent) {
    if (event.key === ONBOARDING.nearArea) onChange();
  }
  window.addEventListener("storage", handle);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handle);
  };
}

export function nearAreaSnapshot() {
  return localStorage.getItem(ONBOARDING.nearArea);
}

export function readNearArea(fallback = DEFAULT_NEAR_AREA) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(ONBOARDING.nearArea) || fallback;
}

export function writeNearArea(slug: string) {
  localStorage.setItem(ONBOARDING.nearArea, slug);
  emit();
}

export function nearAreaName(slug: string) {
  return areaBySlug(slug)?.name ?? "Nairobi";
}
