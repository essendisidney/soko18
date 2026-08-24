import type { SeedProfile } from "@/lib/types";

type RankInput = {
  profiles: SeedProfile[];
  citySlug?: string | null;
  seenIds?: string[];
};

export function rankProfiles({ profiles, citySlug, seenIds = [] }: RankInput) {
  const seen = new Set(seenIds);
  return profiles
    .filter((p) => !seen.has(p.id))
    .map((p) => {
      let score = p.verified ? 12 : 0;
      if (citySlug && p.citySlug === citySlug) score += 28;
      if (p.presence === "active") score += 12;
      if (p.presence === "recent") score += 6;
      if (p.featured) score += 3;
      score += Math.min(p.photos.length, 3) * 4;
      score += Math.min(p.likes, 80) * 0.04;
      return { profile: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.profile);
}
