import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/nairobi", "/browse", "/city/", "/category/", "/profile/", "/terms", "/privacy", "/safety"],
      disallow: ["/admin", "/studio", "/messages", "/login", "/signup", "/dev", "/settings", "/me", "/matches"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
