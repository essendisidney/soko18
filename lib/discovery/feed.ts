import { PROFILES } from "@/lib/data/seed";
import { rankProfiles, type RankContext } from "@/lib/discovery/rank";
import { isGoldenHour } from "@/lib/visibility/golden-hour";
import { filterGhosts, seedIncognitoIds } from "@/lib/privacy/incognito";
import { SEED_INBOUND_IDS } from "@/lib/likes/ids";
import type { SeedProfile } from "@/lib/types";

export function getDiscoverFeed(
  ctx: RankContext & { cursor?: number; limit?: number; likedYouIds?: Iterable<string> } = {},
): { items: SeedProfile[]; nextCursor: number | null } {
  const limit = ctx.limit ?? 16;
  const cursor = ctx.cursor ?? 0;
  const ranked = rankProfiles(PROFILES, {
    citySlug: ctx.citySlug ?? "nairobi",
    nearArea: ctx.nearArea ?? "kilimani",
    gender: ctx.gender ?? "man",
    intents: ctx.intents ?? [],
    impressedIds: ctx.impressedIds ?? [],
    excludeIds: ctx.excludeIds ?? [],
    goldenHour: ctx.goldenHour ?? isGoldenHour(),
  });
  const visible = filterGhosts(ranked, seedIncognitoIds(PROFILES), ctx.likedYouIds ?? SEED_INBOUND_IDS);
  const items = visible.slice(cursor, cursor + limit);
  const next = cursor + items.length;
  return {
    items,
    nextCursor: next < visible.length ? next : null,
  };
}
