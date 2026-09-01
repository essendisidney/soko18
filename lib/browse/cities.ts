import { LAUNCH_CITY, WAITLIST_CITIES } from "@/lib/data/nairobi";
import { waitlistAreas } from "@/lib/data/waitlist";
import { activeNow } from "@/lib/nairobi/live";

export type CityRecord = {
  slug: string;
  name: string;
  live: boolean;
};

export function allCities(): CityRecord[] {
  return [
    { slug: LAUNCH_CITY.slug, name: LAUNCH_CITY.name, live: true },
    ...WAITLIST_CITIES.map((city) => ({ ...city, live: true })),
  ];
}

export function getCity(slug: string) {
  return allCities().find((city) => city.slug === slug) ?? null;
}

export function cityPayload(slug: string) {
  const city = getCity(slug);
  if (!city) return null;
  if (city.slug !== LAUNCH_CITY.slug) {
    return {
      ...city,
      waitlist: false,
      activeNow: 0,
      areas: waitlistAreas(city.slug).map((area) => ({ slug: area.slug, name: area.name })),
    };
  }
  const live = activeNow();
  return {
    ...city,
    waitlist: false,
    activeNow: live.city,
    areas: live.areas,
  };
}
