import { describe, expect, it } from "vitest";
import {
  addReportFlag,
  hiddenFromPublicIds,
  needsStaffReview,
  ratingFit,
  reportedIdsForViewer,
  safetyPenalty,
  staffQueue,
  uniqueReporterCount,
} from "@/lib/reports/tally";
import { rankScore } from "@/lib/discovery/rank";
import { testProfile } from "../helpers/profile";

describe("three reports", () => {
  it("needs staff after three unique reporters and hides from Discover", () => {
    let flags: ReturnType<typeof addReportFlag>["flags"] = [];
    flags = addReportFlag(flags, { profileId: "p2", reporterId: "a", reason: "spam", at: 1 }).flags;
    flags = addReportFlag(flags, { profileId: "p2", reporterId: "b", reason: "fake", at: 2 }).flags;
    const two = addReportFlag(flags, { profileId: "p2", reporterId: "b", reason: "fake", at: 3 });
    expect(two.count).toBe(2);
    expect(two.staff).toBe(false);
    const three = addReportFlag(two.flags, { profileId: "p2", reporterId: "c", reason: "unsafe", at: 4 });
    expect(three.count).toBe(3);
    expect(needsStaffReview(three.count)).toBe(true);
    expect(hiddenFromPublicIds(three.flags)).toEqual(["p2"]);
    expect(reportedIdsForViewer(three.flags, "a")).toEqual(["p2"]);
    expect(staffQueue(three.flags)[0]).toEqual({ profileId: "p2", count: 3 });
    expect(uniqueReporterCount(three.flags, "missing")).toBe(0);
  });

  it("penalizes rank from reports and never invents a 5-star average", () => {
    expect(safetyPenalty(0)).toBe(0);
    expect(safetyPenalty(3)).toBe(1);
    expect(ratingFit(null)).toBe(0.5);
    expect(ratingFit(5)).toBe(1);
    const person = testProfile({ id: "p2", slug: "p2" });
    expect(rankScore(person, { citySlug: "nairobi", reportCounts: { p2: 3 } })).toBeLessThan(
      rankScore(person, { citySlug: "nairobi" }),
    );
    expect(rankScore(person, { citySlug: "nairobi", ratingAverages: { p2: 5 } })).toBeGreaterThan(
      rankScore(person, { citySlug: "nairobi" }),
    );
  });
});
