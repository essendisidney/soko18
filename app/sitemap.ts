import type { MetadataRoute } from "next";
import { NAIROBI_AREAS } from "@/lib/data/nairobi";
import { nairobiProfiles } from "@/lib/data/seed";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://soko18.app";
  return [
    { url: base },
    { url: `${base}/nairobi` },
    ...NAIROBI_AREAS.map((area) => ({ url: `${base}/nairobi/${area.slug}` })),
    ...nairobiProfiles()
      .filter((p) => p.indexPublic)
      .map((p) => ({ url: `${base}/profile/${p.slug}` })),
  ];
}
