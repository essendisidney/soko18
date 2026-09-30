import { PROFILES } from "@/lib/data/seed";
import { rankProfiles, type RankContext } from "@/lib/discovery/rank";
import { isGoldenHour } from "@/lib/visibility/golden-hour";
import { filterGhosts, seedIncognitoIds } from "@/lib/privacy/incognito";
import { SEED_INBOUND_IDS } from "@/lib/likes/ids";
import type { SeedProfile } from "@/lib/types";

/** Live catalog for a city. Empty cities stay empty — never borrow Nairobi people. */
export function catalogForCity(citySlug = "nairobi") {
  return PROFILES.filter((profile) => profile.citySlug === citySlug);
}

export function getDiscoverFeed(
  ctx: RankContext & { cursor?: number; limit?: number; likedYouIds?: Iterable<string> } = {},
): { items: SeedProfile[]; nextCursor: number | null } {
  const limit = ctx.limit ?? 16;
  const cursor = ctx.cursor ?? 0;
  const citySlug = ctx.citySlug ?? "nairobi";
  const pool = catalogForCity(citySlug);
  const ranked = rankProfiles(pool, {
    citySlug,
    nearArea: ctx.nearArea ?? (citySlug === "nairobi" ? "kilimani" : null),
    gender: ctx.gender ?? "man",
    intents: ctx.intents ?? [],
    impressedIds: ctx.impressedIds ?? [],
    excludeIds: ctx.excludeIds ?? [],
    goldenHour: ctx.goldenHour ?? isGoldenHour(),
    goldenPinnedIds: ctx.goldenPinnedIds,
    reportCounts: ctx.reportCounts,
    ratingAverages: ctx.ratingAverages,
  });
  const visible = filterGhosts(ranked, seedIncognitoIds(pool), ctx.likedYouIds ?? SEED_INBOUND_IDS);
  const items = visible.slice(cursor, cursor + limit);
  const next = cursor + items.length;
  return {
    items,
    nextCursor: next < visible.length ? next : null,
  };
}
