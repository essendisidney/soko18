import { NAIROBI_AREAS } from "@/lib/data/nairobi";
import { DEFAULT_NEAR_AREA } from "@/lib/nairobi/near";
import { nairobiProfiles } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import type { SeedProfile } from "@/lib/types";

export type NairobiFilter = "trending" | "active" | "new" | "verified" | "near";
export type NairobiNowId = "trending" | "joined" | "viewed" | "liked" | "verified" | "rising";

const ORGANIC_FEATURED_CAP = 0.15;

function catalog(profiles?: SeedProfile[]) {
  return (profiles ?? nairobiProfiles()).filter(hasApprovedCover);
}

function organicScore(p: SeedProfile) {
  const recency = p.presence === "active" ? 12 : p.presence === "recent" ? 6 : 0;
  const paidBoost = p.featured ? Math.min(8, 8 * ORGANIC_FEATURED_CAP * 10) : 0;
  return p.likes * 1.2 + p.views * 0.08 + recency + paidBoost;
}

export function activeNow(profiles?: SeedProfile[]) {
  const active = catalog(profiles).filter((p) => p.presence === "active");
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
  nearArea = DEFAULT_NEAR_AREA,
  profiles?: SeedProfile[],
) {
  const list = catalog(profiles);
  switch (facet) {
    case "active":
      return list.filter((p) => p.presence === "active" || p.presence === "recent");
    case "new":
      return list.filter((p) => p.newToday);
    case "verified":
      return list.filter((p) => p.verified);
    case "near":
      return list.filter((p) => p.areaSlug === nearArea);
    case "trending":
    default:
      return nairobiNow("trending", list);
  }
}

export function nairobiNow(facet: NairobiNowId, profiles?: SeedProfile[]) {
  const list = [...catalog(profiles)];
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

export function welcomeBackStats(profiles?: SeedProfile[]) {
  const list = catalog(profiles);
  return {
    newProfiles: list.filter((p) => p.newToday).length,
    newlyVerified: list.filter((p) => p.verified && p.newToday).length,
    recentlyActive: list.filter((p) => p.presence === "active" || p.presence === "recent").length,
    activeNow: list.filter((p) => p.presence === "active").length,
    live: list.length,
    newMatches: 0,
  };
}

/** City-wide inventory integers wait until the room is not empty. 1,842 / 2,847 are targets, never display lies. */
export const INVENTORY_COUNT_FLOOR = 200;

export function showInventoryCounts(liveCount: number) {
  return liveCount >= INVENTORY_COUNT_FLOOR;
}

export function activeAreaNames(profiles?: SeedProfile[], limit = 4) {
  return activeNow(profiles)
    .areas.slice(0, limit)
    .map((area) => area.name);
}

export function nairobiPlaceLine(profiles?: SeedProfile[], limit = 3) {
  const names = activeAreaNames(profiles, limit);
  return names.length > 0 ? names.join(" · ") : "Nairobi";
}

export function nairobiInventoryLine(profiles?: SeedProfile[]) {
  const stats = welcomeBackStats(profiles);
  if (!showInventoryCounts(stats.live)) return null;
  return `${stats.live} live · ${stats.activeNow} active now`;
}

export function nairobiHour(now: Date | string = new Date()) {
  const date = typeof now === "string" ? new Date(now) : now;
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      hour: "numeric",
      hourCycle: "h23",
    }).format(date),
  );
}

export function nairobiGreeting(now?: Date | string) {
  const hour = nairobiHour(now);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function nairobiAliveLine(now?: Date | string) {
  const hour = nairobiHour(now);
  if (hour >= 18 || hour < 5) return "Nairobi is active tonight.";
  return "Nairobi is active.";
}
