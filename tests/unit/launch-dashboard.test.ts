import { describe, expect, it } from "vitest";
import { nextMilestone, totals, type DayRow } from "@/lib/admin/launch";

const day = (over: Partial<DayRow>): DayRow => ({
  day: "2026-10-21", signups: 0, went_live: 0, students: 0, invites: 0, likes: 0, matches: 0, messages: 0, paid: 0, revenue_kes: 0, ...over,
});

describe("launch dashboard", () => {
  it("adds up the days", () => {
    expect(totals([day({ signups: 2, revenue_kes: 149 }), day({ signups: 3, revenue_kes: 49 })])).toMatchObject({ signups: 5, revenue_kes: 198 });
  });
  it("names the next milestone of the plan", () => {
    expect(nextMilestone(undefined)).toContain("first 10");
    expect(nextMilestone({ shortName: "UoN", joined: 4, target: 50, status: "collecting" })).toBe("UoN: 6 more to reach the first 10.");
    expect(nextMilestone({ shortName: "UoN", joined: 30, target: 50, status: "collecting" })).toContain("20 more to open");
    expect(nextMilestone({ shortName: "UoN", joined: 50, target: 50, status: "live" })).toContain("launch night");
  });
});
