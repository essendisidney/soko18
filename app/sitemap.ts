import type { MetadataRoute } from "next";
import { BROWSE_CATEGORIES } from "@/lib/browse/categories";
import { NAIROBI_AREAS, WAITLIST_CITIES } from "@/lib/data/nairobi";
import { nairobiProfiles } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base },
    { url: `${base}/nairobi` },
    { url: `${base}/browse` },
    { url: `${base}/terms` },
    { url: `${base}/privacy` },
    { url: `${base}/safety` },
    ...NAIROBI_AREAS.map((area) => ({ url: `${base}/nairobi/${area.slug}` })),
    ...WAITLIST_CITIES.map((city) => ({ url: `${base}/city/${city.slug}` })),
    ...BROWSE_CATEGORIES.map((cat) => ({ url: `${base}/category/${cat.slug}` })),
    ...nairobiProfiles()
      .filter((p) => p.indexPublic && hasApprovedCover(p))
      .map((p) => ({ url: `${base}/profile/${p.slug}` })),
  ];
}
