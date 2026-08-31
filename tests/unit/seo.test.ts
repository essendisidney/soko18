import { describe, expect, it } from "vitest";
import { nairobiProfiles } from "@/lib/data/seed";
import { profileHeading, profileMetadata } from "@/lib/profile/seo";
import { sitemapPaths } from "@/lib/seo/sitemap";
import { crawlAllow } from "@/lib/seo/robots";

describe("Nairobi landing SEO", () => {
  it("indexes only owner-consented live profiles", () => {
    const amani = nairobiProfiles().find((p) => p.slug === "amani-nairobi")!;
    const chebet = nairobiProfiles().find((p) => p.slug === "chebet-nairobi")!;
    expect(profileMetadata(amani).robots).toEqual({ index: true, follow: true });
    expect(profileMetadata(chebet).robots).toEqual({ index: false, follow: true });
    expect(profileHeading(amani)).toBe("Amani, 26 · Kilimani, Nairobi");
  });

  it("keeps the sitemap on Nairobi and consented profiles", () => {
    const paths = sitemapPaths();
    expect(paths).toContain("/nairobi");
    expect(paths).toContain("/nairobi/westlands");
    expect(paths).toContain("/profile/amani-nairobi");
    expect(paths).not.toContain("/profile/chebet-nairobi");
    expect(paths.some((path) => path.startsWith("/kisumu") || path.includes("/mombasa"))).toBe(false);
  });

  it("does not list waitlist cities as crawl targets", () => {
    const allow = crawlAllow();
    expect(allow).toContain("/nairobi");
    expect(allow).toContain("/category/");
    expect(allow.some((path) => path.includes("kisumu") || path.includes("mombasa"))).toBe(false);
  });
});
