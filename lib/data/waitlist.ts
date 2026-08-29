import { WAITLIST_CITIES } from "@/lib/data/nairobi";

export const WAITLIST_AREAS = {
  kisumu: [
    { slug: "milimani", name: "Milimani" },
    { slug: "mamboleo", name: "Mamboleo" },
    { slug: "cbd", name: "CBD" },
    { slug: "kondele", name: "Kondele" },
  ],
  mombasa: [
    { slug: "nyali", name: "Nyali" },
    { slug: "bamburi", name: "Bamburi" },
    { slug: "old-town", name: "Old Town" },
    { slug: "kizingo", name: "Kizingo" },
  ],
  nakuru: [
    { slug: "section-58", name: "Section 58" },
    { slug: "milimani", name: "Milimani" },
    { slug: "london", name: "London" },
    { slug: "cbd", name: "CBD" },
  ],
  eldoret: [
    { slug: "elgon-view", name: "Elgon View" },
    { slug: "pioneer", name: "Pioneer" },
    { slug: "west-indies", name: "West Indies" },
    { slug: "cbd", name: "CBD" },
  ],
} as const;

export type WaitlistSlug = (typeof WAITLIST_CITIES)[number]["slug"];

export function waitlistCity(slug: string) {
  return WAITLIST_CITIES.find((city) => city.slug === slug) ?? null;
}

export function waitlistAreas(slug: string) {
  if (slug === "kisumu") return WAITLIST_AREAS.kisumu;
  if (slug === "mombasa") return WAITLIST_AREAS.mombasa;
  if (slug === "nakuru") return WAITLIST_AREAS.nakuru;
  if (slug === "eldoret") return WAITLIST_AREAS.eldoret;
  return [] as { slug: string; name: string }[];
}

export function waitlistArea(city: string, area: string) {
  return waitlistAreas(city).find((item) => item.slug === area);
}
