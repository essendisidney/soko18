import { cityNameBySlug, snapPlace, type GeoPlace } from "@/lib/geo/kenya";
import { ONBOARDING } from "@/lib/onboarding";
import { checkIn } from "@/lib/presence/here";

export type LocateResult =
  | { ok: true; place: GeoPlace }
  | { ok: false; error: "denied" | "unavailable" };

function applyPlace(place: GeoPlace) {
  checkIn(place.areaSlug, place.citySlug);
}

export function readCitySlug() {
  if (typeof window === "undefined") return "nairobi";
  return localStorage.getItem(ONBOARDING.city) || "nairobi";
}

export function readCityName() {
  return cityNameBySlug(readCitySlug());
}

export function locateFromCoords(lat: number, lng: number) {
  const place = snapPlace(lat, lng);
  applyPlace(place);
  return place;
}

export function locateHere(): Promise<LocateResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, error: "unavailable" });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const place = locateFromCoords(pos.coords.latitude, pos.coords.longitude);
        resolve({ ok: true, place });
      },
      (err) => {
        resolve({ ok: false, error: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    );
  });
}
