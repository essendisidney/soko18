import type { MetadataRoute } from "next";
import { sitemapPaths } from "@/lib/seo/sitemap";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return sitemapPaths().map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
  }));
}
