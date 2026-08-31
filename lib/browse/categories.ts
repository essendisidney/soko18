export const BROWSE_CATEGORIES = [
  { slug: "trending", name: "Trending", line: "From real activity in Nairobi." },
  { slug: "verified", name: "Verified", line: "Phone, identity, and profile reviewed." },
  { slug: "featured", name: "Featured", line: "Paid placement. Not organic Nairobi Now." },
  { slug: "rising", name: "Rising", line: "Moving in Nairobi this week." },
] as const;

export type BrowseCategorySlug = (typeof BROWSE_CATEGORIES)[number]["slug"];

export function categoryBySlug(slug: string) {
  return BROWSE_CATEGORIES.find((c) => c.slug === slug) ?? null;
}
