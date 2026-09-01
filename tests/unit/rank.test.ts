import { describe, expect, it } from "vitest";
import { capFeatured, rankProfiles, rankScore } from "@/lib/discovery/rank";
import { nairobiProfiles } from "@/lib/data/seed";
import { testProfile } from "../helpers/profile";

describe("ranking", () => {
  it("drops excluded ids and covers that are not approved https", () => {
    const keep = testProfile({ id: "keep", slug: "keep" });
    const passed = testProfile({ id: "passed", slug: "passed" });
    const pending = testProfile({
      id: "pending",
      slug: "pending",
      photos: ["blob:local-pending"],
    });

    const ranked = rankProfiles([keep, passed, pending], {
      citySlug: "nairobi",
      excludeIds: ["passed"],
    });

    expect(ranked.map((p) => p.id)).toEqual(["keep"]);
  });

  it("caps featured to at most one in the first eight", () => {
    const profiles = [
      ...Array.from({ length: 6 }, (_, i) =>
        testProfile({ id: `f${i}`, slug: `f${i}`, name: `F${i}`, featured: true }),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        testProfile({ id: `o${i}`, slug: `o${i}`, name: `O${i}`, featured: false }),
      ),
    ];

    const ranked = rankProfiles(profiles, { citySlug: "nairobi" });
    expect(ranked.slice(0, 8).filter((p) => p.featured).length).toBeLessThanOrEqual(1);
    expect(capFeatured(profiles).slice(0, 8).filter((p) => p.featured).length).toBeLessThanOrEqual(1);
  });

  it("boosts verified profiles when intent is connect", () => {
    const verified = testProfile({
      id: "v",
      slug: "v",
      verified: true,
      verification: { phone: true, identity: true, profile: true, established: true },
    });
    const unverified = testProfile({
      id: "u",
      slug: "u",
      verified: false,
      verification: { phone: false, identity: false, profile: false, established: false },
    });
    expect(rankScore(verified, { citySlug: "nairobi", intents: ["connect"] })).toBeGreaterThan(
      rankScore(unverified, { citySlug: "nairobi", intents: ["connect"] }),
    );
  });

  it("caps the featured bonus at 0.04", () => {
    const organic = testProfile({ id: "organic", slug: "organic", featured: false });
    const featured = testProfile({ id: "featured", slug: "featured", featured: true });
    expect(rankScore(featured, { citySlug: "nairobi" }) - rankScore(organic, { citySlug: "nairobi" })).toBeCloseTo(
      0.04,
      10,
    );
  });

  it("ranks men in the same area first", () => {
    const ranked = rankProfiles(nairobiProfiles(), {
      citySlug: "nairobi",
      nearArea: "kilimani",
      gender: "man",
    });
    expect(ranked[0]?.gender).toBe("man");
    expect(ranked[0]?.areaSlug).toBe("kilimani");
  });

  it("returns a Nairobi seed deck after exclusions", () => {
    const all = nairobiProfiles();
    const ranked = rankProfiles(all, { citySlug: "nairobi", excludeIds: ["p1"] });
    expect(ranked.some((p) => p.id === "p1")).toBe(false);
    expect(ranked.length).toBeGreaterThan(0);
  });
});
