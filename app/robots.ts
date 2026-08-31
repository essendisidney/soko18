import type { MetadataRoute } from "next";
import { crawlAllow, crawlDisallow } from "@/lib/seo/robots";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: crawlAllow(),
      disallow: crawlDisallow(),
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
