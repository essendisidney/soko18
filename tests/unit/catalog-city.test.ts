import { describe, expect, it } from "vitest";
import { guestAuthLine, guestBrowseLine } from "@/lib/auth/guest";
import { nairobiProfiles, seedProfile, similarProfiles } from "@/lib/data/seed";
import type { SeedProfile } from "@/lib/types";

describe("catalog city", () => {
  it("resolves seed people by id or slug and leaves empty cities empty", () => {
    expect(seedProfile("p1")?.slug).toBe("amani-nairobi");
    expect(seedProfile("amani-nairobi")?.id).toBe("p1");
    expect(seedProfile("ghost-kisumu")).toBeUndefined();
  });

  it("keeps similar profiles in the same city", () => {
    const amani = nairobiProfiles().find((p) => p.slug === "amani-nairobi")!;
    expect(similarProfiles(amani).every((p) => p.citySlug === "nairobi")).toBe(true);

    const kisumuGhost = {
      ...amani,
      id: "ghost",
      slug: "ghost-kisumu",
      city: "Kisumu",
      citySlug: "kisumu",
      area: "Milimani",
      areaSlug: "milimani",
    } satisfies SeedProfile;
    expect(similarProfiles(kisumuGhost)).toEqual([]);
  });

  it("names the snapped city on the guest wall", () => {
    expect(guestBrowseLine("nairobi")).toBe("You can keep browsing Nairobi as a guest.");
    expect(guestBrowseLine("kisumu")).toBe("You can keep browsing Kisumu as a guest.");
    expect(guestAuthLine("kisumu")).toBe(
      "Discover as a guest in Kisumu. Sign in when you like, Spotlight, or message.",
    );
  });
});
