export const LAUNCH_CITY = {
  slug: "nairobi",
  name: "Nairobi",
} as const;

export const NAIROBI_AREAS = [
  { slug: "westlands", name: "Westlands" },
  { slug: "kilimani", name: "Kilimani" },
  { slug: "kileleshwa", name: "Kileleshwa" },
  { slug: "lavington", name: "Lavington" },
  { slug: "cbd", name: "CBD" },
  { slug: "south-b", name: "South B" },
  { slug: "karen", name: "Karen" },
  { slug: "parklands", name: "Parklands" },
  { slug: "thika-road", name: "Thika Road" },
] as const;

export type NairobiAreaSlug = (typeof NAIROBI_AREAS)[number]["slug"];

export const WAITLIST_CITIES = [
  { slug: "mombasa", name: "Mombasa" },
  { slug: "kisumu", name: "Kisumu" },
  { slug: "nakuru", name: "Nakuru" },
  { slug: "eldoret", name: "Eldoret" },
] as const;

export const INTENTS = [
  { id: "connect", label: "Connect" },
  { id: "meet", label: "Meet" },
  { id: "browse", label: "Browse" },
  { id: "featured", label: "Featured in Nairobi" },
] as const;

export const NAIROBI_FILTERS = [
  { id: "trending", label: "Trending now" },
  { id: "active", label: "Recently active" },
  { id: "new", label: "New today" },
  { id: "verified", label: "Verified" },
  { id: "near", label: "Near you" },
] as const;

export const NAIROBI_NOW = [
  { id: "trending", label: "Trending" },
  { id: "joined", label: "Recently joined" },
  { id: "viewed", label: "Most viewed" },
  { id: "liked", label: "Most liked" },
  { id: "verified", label: "Newly verified" },
  { id: "rising", label: "Rising" },
] as const;

export function areaBySlug(slug: string) {
  return NAIROBI_AREAS.find((a) => a.slug === slug);
}
