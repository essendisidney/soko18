import { describe, expect, it } from "vitest";
import { nairobiProfiles } from "@/lib/data/seed";
import { sokoVerified } from "@/lib/trust/verified";
import { testProfile } from "../helpers/profile";

describe("SOKO18 Verified", () => {
  it("needs phone, identity, and profile reviewed", () => {
    expect(
      sokoVerified(
        testProfile({
          verification: { phone: true, identity: true, profile: true, established: false },
        }),
      ),
    ).toBe(true);
    expect(
      sokoVerified(
        testProfile({
          verified: true,
          verification: { phone: true, identity: false, profile: true, established: true },
        }),
      ),
    ).toBe(false);
  });

  it("does not gold-tick catalog rows with incomplete checks", () => {
    const amani = nairobiProfiles().find((p) => p.slug === "amani-nairobi");
    const nia = nairobiProfiles().find((p) => p.slug === "nia-nairobi");
    expect(sokoVerified(amani!)).toBe(true);
    expect(sokoVerified(nia!)).toBe(false);
  });
});
