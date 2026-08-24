import { NAIROBI_AREAS } from "@/lib/data/nairobi";
import { nairobiProfiles } from "@/lib/data/seed";
import type { SeedProfile } from "@/lib/types";

export type NairobiFilter = "trending" | "active" | "new" | "verified" | "near";
export type NairobiNowId = "trending" | "joined" | "viewed" | "liked" | "verified" | "rising";

const ORGANIC_FEATURED_CAP = 0.15;

function organicScore(p: SeedProfile) {
  const recency = p.presence === "active" ? 12 : p.presence === "recent" ? 6 : 0;
  const paidBoost = p.featured ? Math.min(8, 8 * ORGANIC_FEATURED_CAP * 10) : 0;
  return p.likes * 1.2 + p.views * 0.08 + recency + paidBoost;
}

export function activeNow(profiles: SeedProfile[] = nairobiProfiles()) {
  const active = profiles.filter((p) => p.presence === "active");
  const byArea = NAIROBI_AREAS.map((area) => ({
    ...area,
    count: active.filter((p) => p.areaSlug === area.slug).length,
  })).filter((a) => a.count > 0);

  return {
    city: active.length,
    areas: byArea,
  };
}

export function filterNairobi(
  facet: NairobiFilter,
  nearArea = "kilimani",
  profiles: SeedProfile[] = nairobiProfiles(),
) {
  switch (facet) {
    case "active":
      return profiles.filter((p) => p.presence === "active" || p.presence === "recent");
    case "new":
      return profiles.filter((p) => p.newToday);
    case "verified":
      return profiles.filter((p) => p.verified);
    case "near":
      return profiles.filter((p) => p.areaSlug === nearArea);
    case "trending":
    default:
      return nairobiNow("trending", profiles);
  }
}

export function nairobiNow(
  facet: NairobiNowId,
  profiles: SeedProfile[] = nairobiProfiles(),
) {
  const list = [...profiles];
  switch (facet) {
    case "joined":
      return list.filter((p) => p.newToday);
    case "viewed":
      return list.sort((a, b) => b.views - a.views);
    case "liked":
      return list.sort((a, b) => b.likes - a.likes);
    case "verified":
      return list.filter((p) => p.verified && p.newToday);
    case "rising":
      return list.filter((p) => p.rising);
    case "trending":
    default:
      return list.sort((a, b) => organicScore(b) - organicScore(a));
  }
}

export function welcomeBackStats(profiles: SeedProfile[] = nairobiProfiles()) {
  return {
    newProfiles: profiles.filter((p) => p.newToday).length,
    newlyVerified: profiles.filter((p) => p.verified && p.newToday).length,
    recentlyActive: profiles.filter((p) => p.presence === "active" || p.presence === "recent").length,
    newMatches: 3,
  };
}
