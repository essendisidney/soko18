import { describe, expect, it } from "vitest";
import { nairobiAliveLine, nairobiGreeting, welcomeBackStats } from "@/lib/nairobi/live";
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

  it("greets on Africa/Nairobi time", () => {
    expect(nairobiGreeting("2026-08-24T05:00:00.000Z")).toBe("Good morning");
    expect(nairobiGreeting("2026-08-24T18:00:00.000Z")).toBe("Good evening");
    expect(nairobiAliveLine("2026-08-24T18:00:00.000Z")).toBe("Nairobi is active tonight.");
    expect(nairobiAliveLine("2026-08-24T08:00:00.000Z")).toBe("Nairobi is active.");
  });
});
