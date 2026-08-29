import type { MetadataRoute } from "next";
import { BROWSE_CATEGORIES } from "@/lib/browse/categories";
import { NAIROBI_AREAS, WAITLIST_CITIES } from "@/lib/data/nairobi";
import { waitlistAreas } from "@/lib/data/waitlist";
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
    ...WAITLIST_CITIES.flatMap((city) => [
      { url: `${base}/${city.slug}` },
      ...waitlistAreas(city.slug).map((area) => ({ url: `${base}/${city.slug}/${area.slug}` })),
    ]),
    ...BROWSE_CATEGORIES.map((cat) => ({ url: `${base}/category/${cat.slug}` })),
    ...nairobiProfiles()
      .filter((p) => p.indexPublic && hasApprovedCover(p))
      .map((p) => ({ url: `${base}/profile/${p.slug}` })),
  ];
}
