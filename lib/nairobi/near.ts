import { areaBySlug } from "@/lib/data/nairobi";
import { waitlistAreas } from "@/lib/data/waitlist";
import { writeCityCookie } from "@/lib/geo/city-cookie";
import { areaSlugInCity, areasForCity } from "@/lib/geo/kenya";
import { ONBOARDING } from "@/lib/onboarding";

export const DEFAULT_NEAR_AREA = "kilimani";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listen) => listen());
}

export function subscribeNearArea(onChange: () => void) {
  listeners.add(onChange);
  function handle(event: StorageEvent) {
    if (event.key === ONBOARDING.nearArea || event.key === ONBOARDING.city) onChange();
  }
  window.addEventListener("storage", handle);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handle);
  };
}

function storedCity() {
  if (typeof window === "undefined") return "nairobi";
  return localStorage.getItem(ONBOARDING.city) || "nairobi";
}

function storedNear() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ONBOARDING.nearArea);
}

/** First real area in the snapped city. Never Kilimani in Kisumu. */
export function defaultNearArea(citySlug = "nairobi") {
  if (citySlug === "nairobi") return DEFAULT_NEAR_AREA;
  return areasForCity(citySlug)[0]?.slug ?? null;
}

/** Rank near the snapped city. Stale Kilimani does not follow Kisumu. */
export function nearFromRequest(citySlug: string, searchNear?: string | null) {
  return areaSlugInCity(citySlug, searchNear) ?? defaultNearArea(citySlug) ?? DEFAULT_NEAR_AREA;
}

export function nearAreaSnapshot() {
  return areaSlugInCity(storedCity(), storedNear());
}

export function citySnapshot() {
  return storedCity();
}

export function writeCity(slug: string) {
  localStorage.setItem(ONBOARDING.city, slug);
  writeCityCookie(slug);
  const near = localStorage.getItem(ONBOARDING.nearArea);
  if (!areaSlugInCity(slug, near)) {
    const next = defaultNearArea(slug);
    if (next) localStorage.setItem(ONBOARDING.nearArea, next);
    else localStorage.removeItem(ONBOARDING.nearArea);
  }
  emit();
}

export function readNearArea(fallback?: string) {
  const city = storedCity();
  return areaSlugInCity(city, storedNear()) ?? fallback ?? defaultNearArea(city) ?? DEFAULT_NEAR_AREA;
}

export function writeNearArea(slug: string) {
  const city = localStorage.getItem(ONBOARDING.city) || "nairobi";
  if (!areaSlugInCity(city, slug)) return;
  localStorage.setItem(ONBOARDING.nearArea, slug);
  emit();
}

export function nearAreaName(slug: string) {
  const city = storedCity();
  if (city === "nairobi") return areaBySlug(slug)?.name ?? "Around you";
  return waitlistAreas(city).find((area) => area.slug === slug)?.name ?? "Around you";
}
