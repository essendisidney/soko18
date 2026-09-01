import type { SeedProfile } from "@/lib/types";
import { hasApprovedCover } from "@/lib/media/public";
import { profileHealth } from "@/lib/profile/health";
import { sokoVerified } from "@/lib/trust/verified";
import { goldenRankBonus } from "@/lib/visibility/golden-hour";
import { hideFromPublic, ratingFit, safetyPenalty } from "@/lib/reports/tally";

const FEATURED_WINDOW = 8;
const FEATURED_BONUS_CAP = 0.04;

export type RankContext = {
  citySlug?: string | null;
  nearArea?: string | null;
  gender?: "man" | "woman" | "any";
  intents?: string[];
  impressedIds?: string[];
  excludeIds?: string[];
  goldenHour?: boolean;
  goldenPinnedIds?: string[];
  reportCounts?: Record<string, number>;
  ratingAverages?: Record<string, number | null>;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function locationProximity(profile: SeedProfile, ctx: RankContext) {
  if (ctx.nearArea && profile.areaSlug === ctx.nearArea && (!ctx.citySlug || profile.citySlug === ctx.citySlug)) {
    return 1;
  }
  if (ctx.citySlug && profile.citySlug === ctx.citySlug) return 0.45;
  return 0.15;
}

export function preferenceFit(profile: SeedProfile, intents: string[] = []) {
  if (intents.length === 0) return 0.5;
  let hits = 0;
  if (intents.includes("featured") && profile.featured) hits += 1;
  if (intents.includes("meet") && profile.availability) hits += 1;
  if (intents.includes("connect") && sokoVerified(profile)) hits += 1;
  if (intents.includes("browse")) hits += 0.5;
  return clamp01(0.35 + hits * 0.25);
}

export function activityRecency(profile: SeedProfile) {
  if (profile.presence === "active") return 1;
  if (profile.presence === "recent") return 0.55;
  return 0.15;
}

export function profileQuality(profile: SeedProfile) {
  return clamp01(profileHealth(profile).score / 100);
}

export function verificationScore(profile: SeedProfile) {
  const v = profile.verification;
  const n = Number(v.phone) + Number(v.identity) + Number(v.profile) + Number(v.established);
  return n / 4;
}

export function freshness(profile: SeedProfile) {
  if (profile.newToday) return 1;
  if (profile.rising) return 0.6;
  return 0.25;
}

export function interactionHistory(profile: SeedProfile, impressedIds: string[] = []) {
  return impressedIds.includes(profile.id) ? 0.35 : 1;
}

export function rankScore(profile: SeedProfile, ctx: RankContext) {
  const reports = ctx.reportCounts?.[profile.id] ?? 0;
  const rating = ctx.ratingAverages?.[profile.id] ?? null;
  return (
    locationProximity(profile, ctx) * 0.28 +
    preferenceFit(profile, ctx.intents) * 0.12 +
    activityRecency(profile) * 0.12 +
    profileQuality(profile) * 0.14 +
    verificationScore(profile) * 0.12 +
    freshness(profile) * 0.08 +
    interactionHistory(profile, ctx.impressedIds) * 0.08 -
    safetyPenalty(reports) * 0.06 +
    (rating == null ? 0 : (ratingFit(rating) - 0.5) * 0.06) +
    Math.min(profile.featured ? 0.04 : 0, FEATURED_BONUS_CAP) +
    (ctx.goldenHour
      ? goldenRankBonus(profile.presence, true, Boolean(ctx.goldenPinnedIds?.includes(profile.id)))
      : 0)
  );
}

export function capFeatured(profiles: SeedProfile[], windowSize = FEATURED_WINDOW) {
  const held: SeedProfile[] = [];
  const out: SeedProfile[] = [];

  function featuredInWindow() {
    return out.slice(-(windowSize - 1)).filter((p) => p.featured).length;
  }

  function flushHeld() {
    while (held.length && featuredInWindow() < 1) {
      out.push(held.shift()!);
    }
  }

  for (const profile of profiles) {
    if (profile.featured && featuredInWindow() >= 1) {
      held.push(profile);
      continue;
    }
    out.push(profile);
    flushHeld();
  }

  return [...out, ...held];
}

export function rankProfiles(profiles: SeedProfile[], ctx: RankContext = {}) {
  const exclude = new Set(ctx.excludeIds ?? []);
  const gender = ctx.gender ?? "any";
  const ranked = profiles
    .filter((p) => !exclude.has(p.id) && hasApprovedCover(p))
    .filter((p) => gender === "any" || p.gender === gender)
    .filter((p) => !hideFromPublic(ctx.reportCounts?.[p.id] ?? 0))
    .map((profile) => ({ profile, score: rankScore(profile, ctx) }))
    .sort((a, b) => b.score - a.score || a.profile.slug.localeCompare(b.profile.slug))
    .map((row) => row.profile);

  return capFeatured(ranked);
}
