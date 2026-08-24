import { describe, expect, it } from "vitest";
import { draftHealth, profileHealth } from "@/lib/profile/health";
import { nairobiProfiles } from "@/lib/data/seed";
import { testProfile } from "../helpers/profile";

describe("health score", () => {
  it("scores a complete live profile at 100", () => {
    const amani = nairobiProfiles().find((p) => p.id === "p1");
    expect(amani).toBeTruthy();
    expect(profileHealth(amani!).score).toBe(100);
  });

  it("drops for missing bio, verification, and extra photos", () => {
    const health = profileHealth(
      testProfile({
        verified: false,
        bio: "",
        photos: ["https://images.unsplash.com/photo-one"],
      }),
    );
    expect(health.score).toBe(25);
    expect(health.checks.filter((c) => c.ok).map((c) => c.label)).toEqual(["Profile photo"]);
  });

  it("scores a complete draft at 100 and an empty draft at 0", () => {
    expect(
      draftHealth({
        displayName: "Amani",
        birthYear: 2000,
        areaSlug: "kilimani",
        bio: "Kilimani evenings.",
      }).score,
    ).toBe(100);

    expect(
      draftHealth({
        displayName: "  ",
        birthYear: null,
        areaSlug: "",
        bio: " ",
      }).score,
    ).toBe(0);
  });
});
