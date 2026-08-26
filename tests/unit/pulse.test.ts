import { describe, expect, it } from "vitest";
import { nairobiAliveLine, nairobiGreeting, nairobiInventoryLine, nairobiPlaceLine, showInventoryCounts, welcomeBackStats } from "@/lib/nairobi/live";
import { nairobiProfiles } from "@/lib/data/seed";
import { testProfile } from "../helpers/profile";

describe("Nairobi pulse", () => {
  it("does not invent matches", () => {
    const stats = welcomeBackStats([
      testProfile({ id: "a", slug: "a", newToday: true, verified: true, presence: "active" }),
      testProfile({ id: "b", slug: "b", newToday: false, presence: "recent" }),
    ]);
    expect(stats.newProfiles).toBe(1);
    expect(stats.newlyVerified).toBe(1);
    expect(stats.recentlyActive).toBe(2);
    expect(stats.newMatches).toBe(0);
  });

  it("seed catalog leads with place, not 16 live", () => {
    expect(nairobiInventoryLine(nairobiProfiles())).toBeNull();
    expect(nairobiPlaceLine(nairobiProfiles())).toBe("Westlands · Kilimani · Kileleshwa");
    expect(nairobiPlaceLine(nairobiProfiles(), 3, "kilimani")).toBe("Kilimani · Westlands · Kileleshwa");
  });

  it("does not advertise an empty room", () => {
    const thin = Array.from({ length: 16 }, (_, i) =>
      testProfile({ id: `p${i}`, slug: `p${i}`, presence: "active", area: "Kilimani", areaSlug: "kilimani" }),
    );
    expect(showInventoryCounts(thin.length)).toBe(false);
    expect(nairobiInventoryLine(thin)).toBeNull();
    expect(nairobiPlaceLine(thin)).toBe("Kilimani");
  });

  it("shows real inventory only after density", () => {
    const dense = Array.from({ length: 200 }, (_, i) =>
      testProfile({
        id: `d${i}`,
        slug: `d${i}`,
        presence: i < 40 ? "active" : "recent",
        area: "Westlands",
        areaSlug: "westlands",
      }),
    );
    expect(nairobiInventoryLine(dense)).toBe("200 live · 40 active now");
  });

  it("greets on Africa/Nairobi time", () => {
    expect(nairobiGreeting("2026-08-24T05:00:00.000Z")).toBe("Good morning");
    expect(nairobiGreeting("2026-08-24T18:00:00.000Z")).toBe("Good evening");
    expect(nairobiAliveLine("2026-08-24T18:00:00.000Z")).toBe("Nairobi is active tonight.");
    expect(nairobiAliveLine("2026-08-24T08:00:00.000Z")).toBe("Nairobi is active.");
  });
});
