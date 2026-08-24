import { nairobiProfiles } from "@/lib/data/seed";
import { rankProfiles, type RankContext } from "@/lib/discovery/rank";
import type { SeedProfile } from "@/lib/types";

export function getDiscoverFeed(
  ctx: RankContext & { cursor?: number; limit?: number } = {},
): { items: SeedProfile[]; nextCursor: number | null } {
  const limit = ctx.limit ?? 16;
  const cursor = ctx.cursor ?? 0;
  const ranked = rankProfiles(nairobiProfiles(), {
    citySlug: ctx.citySlug ?? "nairobi",
    nearArea: ctx.nearArea ?? "kilimani",
    intents: ctx.intents ?? [],
    impressedIds: ctx.impressedIds ?? [],
    excludeIds: ctx.excludeIds ?? [],
  });
  const items = ranked.slice(cursor, cursor + limit);
  const next = cursor + items.length;
  return {
    items,
    nextCursor: next < ranked.length ? next : null,
  };
}
