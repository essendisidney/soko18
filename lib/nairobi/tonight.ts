import type { Impression } from "@/lib/discovery/impressions";
import { areaBySlug } from "@/lib/data/nairobi";
import type { SeedProfile } from "@/lib/types";

/** Areas you actually opened tonight. Names only — no invented counts. */
export function tonightAreaNames(
  impressions: Impression[],
  profiles: Array<Pick<SeedProfile, "id" | "areaSlug">>,
  limit = 3,
) {
  const byId = new Map(profiles.map((row) => [row.id, row.areaSlug]));
  const counts = new Map<string, number>();
  for (const row of impressions) {
    const slug = byId.get(row.profileId);
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([slug]) => areaBySlug(slug)?.name)
    .filter((name): name is string => Boolean(name));
}
