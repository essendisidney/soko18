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
  thika: [
    { slug: "makongeni", name: "Makongeni" },
    { slug: "boma", name: "Boma" },
    { slug: "kiandutu", name: "Kiandutu" },
    { slug: "cbd", name: "CBD" },
  ],
  machakos: [
    { slug: "mjini", name: "Mjini" },
    { slug: "katoloni", name: "Katoloni" },
    { slug: "kalama", name: "Kalama" },
    { slug: "cbd", name: "CBD" },
  ],
  kitale: [
    { slug: "milimani", name: "Milimani" },
    { slug: "hospital", name: "Hospital" },
    { slug: "section-six", name: "Section Six" },
    { slug: "cbd", name: "CBD" },
  ],
  kakamega: [
    { slug: "milimani", name: "Milimani" },
    { slug: "amalemba", name: "Amalemba" },
    { slug: "shirere", name: "Shirere" },
    { slug: "cbd", name: "CBD" },
  ],
  kisii: [
    { slug: "mwembe", name: "Mwembe" },
    { slug: "nyanchwa", name: "Nyanchwa" },
    { slug: "university", name: "University" },
    { slug: "cbd", name: "CBD" },
  ],
  nyeri: [
    { slug: "ruringu", name: "Ruring’u" },
    { slug: "kingongo", name: "King’ong’o" },
    { slug: "whitehouse", name: "Whitehouse" },
    { slug: "cbd", name: "CBD" },
  ],
  meru: [
    { slug: "milimani", name: "Milimani" },
    { slug: "makutano", name: "Makutano" },
    { slug: "gakoromone", name: "Gakoromone" },
    { slug: "cbd", name: "CBD" },
  ],
  malindi: [
    { slug: "casuarina", name: "Casuarina" },
    { slug: "maweni", name: "Maweni" },
    { slug: "silversands", name: "Silversands" },
    { slug: "cbd", name: "CBD" },
  ],
  naivasha: [
    { slug: "karagita", name: "Karagita" },
    { slug: "kihoto", name: "Kihoto" },
    { slug: "lake-view", name: "Lake View" },
    { slug: "cbd", name: "CBD" },
  ],
  kericho: [
    { slug: "milimani", name: "Milimani" },
    { slug: "township", name: "Township" },
    { slug: "brookside", name: "Brookside" },
    { slug: "cbd", name: "CBD" },
  ],
  embu: [
    { slug: "dallas", name: "Dallas" },
    { slug: "blue-valley", name: "Blue Valley" },
    { slug: "majengo", name: "Majengo" },
    { slug: "cbd", name: "CBD" },
  ],
  nanyuki: [
    { slug: "milimani", name: "Milimani" },
    { slug: "likii", name: "Likii" },
    { slug: "sports", name: "Nanyuki Sports" },
    { slug: "cbd", name: "CBD" },
  ],
  garissa: [
    { slug: "township", name: "Township" },
    { slug: "bulla-iftin", name: "Bulla Iftin" },
    { slug: "medina", name: "Medina" },
    { slug: "cbd", name: "CBD" },
  ],
  kitui: [
    { slug: "kalundu", name: "Kalundu" },
    { slug: "miambani", name: "Miambani" },
    { slug: "township", name: "Township" },
    { slug: "cbd", name: "CBD" },
  ],
  "homa-bay": [
    { slug: "sofia", name: "Sofia" },
    { slug: "makongeni", name: "Makongeni" },
    { slug: "shauri-yako", name: "Shauri Yako" },
    { slug: "cbd", name: "CBD" },
  ],
  migori: [
    { slug: "oruba", name: "Oruba" },
    { slug: "namba", name: "Namba" },
    { slug: "nyasare", name: "Nyasare" },
    { slug: "cbd", name: "CBD" },
  ],
} as const;

export type WaitlistSlug = (typeof WAITLIST_CITIES)[number]["slug"];

export function waitlistCity(slug: string) {
  return WAITLIST_CITIES.find((city) => city.slug === slug) ?? null;
}

export function waitlistAreas(slug: string) {
  if (slug in WAITLIST_AREAS) return WAITLIST_AREAS[slug as WaitlistSlug];
  return [] as { slug: string; name: string }[];
}

export function waitlistArea(city: string, area: string) {
  return waitlistAreas(city).find((item) => item.slug === area);
}
