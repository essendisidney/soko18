import { nairobiProfiles } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import { filterNairobi, nairobiNow, type NairobiFilter, type NairobiNowId } from "@/lib/nairobi/live";
import { filterGhosts, seedIncognitoIds } from "@/lib/privacy/incognito";
import { SEED_INBOUND_IDS } from "@/lib/likes/ids";
import type { SeedProfile } from "@/lib/types";

export function searchNairobi(query: string, profiles: SeedProfile[] = nairobiProfiles()) {
  const q = query.trim().toLowerCase();
  const live = filterGhosts(profiles.filter(hasApprovedCover), seedIncognitoIds(profiles), SEED_INBOUND_IDS);
  if (!q) return live;
  return live.filter((p) => `${p.name} ${p.area} ${p.bio}`.toLowerCase().includes(q));
}

export function browseFeed({
  city = "nairobi",
  q = "",
  facet = "trending",
  cursor = 0,
  limit = 16,
}: {
  city?: string;
  q?: string;
  facet?: NairobiFilter | NairobiNowId | "featured";
  cursor?: number;
  limit?: number;
}) {
  if (city !== "nairobi") {
    return {
      items: [] as SeedProfile[],
      nextCursor: null as number | null,
      live: true,
      waitlist: false,
    };
  }

  let items: SeedProfile[];
  if (q.trim()) {
    items = searchNairobi(q);
  } else if (facet === "featured") {
    items = searchNairobi("").filter((p) => p.featured);
  } else if (facet === "joined" || facet === "viewed" || facet === "liked" || facet === "rising") {
    items = nairobiNow(facet);
  } else {
    items = filterNairobi((facet as NairobiFilter) || "trending");
  }

  const page = items.slice(cursor, cursor + limit);
  const next = cursor + page.length;
  return {
    items: page,
    nextCursor: next < items.length ? next : null,
    live: true,
    waitlist: false,
  };
}
