import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/nairobi", "/browse", "/city/", "/category/", "/profile/"],
      disallow: ["/admin", "/studio", "/messages", "/login", "/signup", "/dev"],
    },
    sitemap: "https://soko18.app/sitemap.xml",
  };
}
