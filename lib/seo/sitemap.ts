import { BROWSE_CATEGORIES } from "@/lib/browse/categories";
import { NAIROBI_AREAS } from "@/lib/data/nairobi";
import { nairobiProfiles } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";

/** Nairobi live surfaces only. Waitlist cities stay off the sitemap. */
export function sitemapPaths() {
  return [
    "/",
    "/nairobi",
    "/terms",
    "/privacy",
    "/safety",
    ...NAIROBI_AREAS.map((area) => `/nairobi/${area.slug}`),
    ...BROWSE_CATEGORIES.map((cat) => `/category/${cat.slug}`),
    ...nairobiProfiles()
      .filter((profile) => profile.indexPublic && hasApprovedCover(profile))
      .map((profile) => `/profile/${profile.slug}`),
  ];
}
