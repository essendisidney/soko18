import type { Presence } from "@/lib/types";
import { areaBySlug } from "@/lib/data/nairobi";
import { waitlistAreas } from "@/lib/data/waitlist";
import { writeNearArea } from "@/lib/nairobi/near";
import { ONBOARDING } from "@/lib/onboarding";

export const HERE_KEY = "soko18_here";
export const ACTIVE_MS = 15 * 60_000;
export const RECENT_MS = 4 * 60 * 60_000;

export type HerePing = {
  areaSlug: string;
  citySlug: string;
  at: number;
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listen) => listen());
}

export function subscribeHere(onChange: () => void) {
  listeners.add(onChange);
  function handle(event: StorageEvent) {
    if (event.key === HERE_KEY) onChange();
  }
  window.addEventListener("storage", handle);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handle);
  };
}

export function hereSnapshot() {
  return localStorage.getItem(HERE_KEY);
}

export function presenceFrom(at: number, now = Date.now()): Presence {
  const age = now - at;
  if (age < 0) return "offline";
  if (age < ACTIVE_MS) return "active";
  if (age < RECENT_MS) return "recent";
  return "offline";
}

function areaName(areaSlug: string, citySlug: string) {
  return (
    areaBySlug(areaSlug)?.name ??
    waitlistAreas(citySlug).find((area) => area.slug === areaSlug)?.name ??
    "Around you"
  );
}

export function checkIn(areaSlug: string, citySlug = "nairobi", now = Date.now()): HerePing {
  const ping: HerePing = { areaSlug, citySlug, at: now };
  if (typeof window !== "undefined") {
    localStorage.setItem(HERE_KEY, JSON.stringify(ping));
    localStorage.setItem(ONBOARDING.city, citySlug);
    writeNearArea(areaSlug);
    emit();
  }
  return ping;
}

export function readHere(): HerePing | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(HERE_KEY) ?? "null") as HerePing | null;
    if (!parsed?.areaSlug || !parsed.at) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hereLine(ping: HerePing | null, now = Date.now()) {
  if (!ping) return "Area-level only. Never a live pin.";
  const name = areaName(ping.areaSlug, ping.citySlug);
  const presence = presenceFrom(ping.at, now);
  if (presence === "active") return `${name} · here now`;
  if (presence === "recent") return `${name} · recently here`;
  return `${name} · last here`;
}
