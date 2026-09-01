import { describe, expect, it } from "vitest";
import { nairobiProfiles } from "@/lib/data/seed";
import {
  areaJsonLd,
  areaMetadata,
  categoryJsonLd,
  categoryMetadata,
  nairobiJsonLd,
  nairobiMetadata,
  profileHeading,
  profileJsonLd,
  profileMetadata,
} from "@/lib/profile/seo";
import { sitemapPaths } from "@/lib/seo/sitemap";
import { crawlAllow } from "@/lib/seo/robots";

describe("Nairobi landing SEO", () => {
  it("indexes only owner-consented live profiles", () => {
    const amani = nairobiProfiles().find((p) => p.slug === "amani-nairobi")!;
    const chebet = nairobiProfiles().find((p) => p.slug === "chebet-nairobi")!;
    expect(profileMetadata(amani).robots).toEqual({ index: true, follow: true });
    expect(profileMetadata(chebet).robots).toEqual({ index: false, follow: true });
    expect(profileHeading(amani)).toBe("Amani, 26 · Kilimani, Nairobi");
    expect(profileJsonLd(amani)?.mainEntity).toEqual({
      "@type": "Person",
      name: "Amani",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kilimani",
        addressRegion: "Nairobi",
        addressCountry: "KE",
      },
    });
    expect(profileJsonLd(chebet)).toBeNull();
  });

  it("keeps the sitemap on Nairobi and consented profiles", () => {
    const paths = sitemapPaths();
    expect(paths).toContain("/nairobi");
    expect(paths).toContain("/nairobi/westlands");
    expect(paths).toContain("/profile/amani-nairobi");
    expect(paths).not.toContain("/profile/chebet-nairobi");
    expect(paths.some((path) => path.startsWith("/kisumu") || path.includes("/mombasa"))).toBe(false);
  });

  it("describes Nairobi landings without inventory counts", () => {
    const city = nairobiJsonLd();
    expect(city["@type"]).toBe("CollectionPage");
    expect(city.about).toEqual({
      "@type": "City",
      name: "Nairobi",
      containedInPlace: { "@type": "Country", name: "Kenya" },
    });
    expect(city).not.toHaveProperty("numberOfItems");

    const area = areaJsonLd("Westlands", "westlands");
    expect(area.name).toBe("Westlands, Nairobi");
    expect(area.about.name).toBe("Westlands");
    expect(area).not.toHaveProperty("numberOfItems");

    const category = categoryJsonLd("Trending", "trending", "From real activity in Nairobi.");
    expect(category.name).toBe("Trending · Nairobi");
    expect(category.about).toEqual({ "@type": "City", name: "Nairobi" });
    expect(category).not.toHaveProperty("numberOfItems");
  });

  it("gives Nairobi landings a canonical URL", () => {
    expect(String(nairobiMetadata().alternates?.canonical)).toMatch(/\/nairobi$/);
    expect(String(areaMetadata("Westlands", "westlands").alternates?.canonical)).toMatch(/\/nairobi\/westlands$/);
    expect(String(categoryMetadata("Trending", "trending", "From real activity in Nairobi.").alternates?.canonical)).toMatch(
      /\/category\/trending$/,
    );
  });

  it("does not list waitlist cities as crawl targets", () => {
    const allow = crawlAllow();
    expect(allow).toContain("/nairobi");
    expect(allow).toContain("/category/");
    expect(allow.some((path) => path.includes("kisumu") || path.includes("mombasa"))).toBe(false);
  });
});
