import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/nairobi", "/profile/"],
      disallow: ["/admin", "/studio", "/messages", "/login", "/dev"],
    },
    sitemap: "https://soko18.app/sitemap.xml",
  };
}
