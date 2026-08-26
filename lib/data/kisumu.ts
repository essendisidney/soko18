export const KISUMU = {
  slug: "kisumu",
  name: "Kisumu",
} as const;

export const KISUMU_AREAS = [
  { slug: "milimani", name: "Milimani" },
  { slug: "mamboleo", name: "Mamboleo" },
  { slug: "cbd", name: "CBD" },
  { slug: "kondele", name: "Kondele" },
] as const;

export function kisumuAreaBySlug(slug: string) {
  return KISUMU_AREAS.find((area) => area.slug === slug);
}
