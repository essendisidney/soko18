import { NAIROBI_AREAS } from "@/lib/data/nairobi";
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
  nearArea = "kilimani",
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
