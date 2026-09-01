import { describe, expect, it } from "vitest";
import { goldenLine, goldenRankBonus, isGoldenHour } from "@/lib/visibility/golden-hour";
import { tonightAreaNames } from "@/lib/nairobi/tonight";
import { canRequestLiveProof, liveProofLine, requestLiveProof, sendLiveProof } from "@/lib/trust/live-proof";
import { canRedeem, normalizePass } from "@/lib/growth/referral";
import { rankScore } from "@/lib/discovery/rank";
import { testProfile } from "../helpers/profile";

describe("golden hour", () => {
  it("is 8–9pm Africa/Nairobi and never a booking discount", () => {
    expect(isGoldenHour("2026-09-01T17:30:00.000Z")).toBe(true);
    expect(isGoldenHour("2026-09-01T19:30:00.000Z")).toBe(false);
    expect(goldenLine("2026-09-01T17:30:00.000Z")).toBe("Golden Hour · 30m left");
    expect(goldenLine("2026-09-01T19:30:00.000Z")).toBe("Golden Hour · 8–9pm EAT");
    expect(goldenRankBonus("active", true)).toBe(0);
    expect(goldenRankBonus("active", true, true)).toBe(0.03);
    expect(goldenRankBonus("active", false, true)).toBe(0);
    expect(goldenRankBonus("offline", true, true)).toBe(0);
    const active = testProfile({ id: "a", slug: "a", presence: "active" });
    const quiet = testProfile({ id: "b", slug: "b", presence: "offline" });
    expect(rankScore(active, { citySlug: "nairobi", goldenHour: true })).toBe(
      rankScore(active, { citySlug: "nairobi", goldenHour: false }),
    );
    expect(
      rankScore(active, { citySlug: "nairobi", goldenHour: true, goldenPinnedIds: ["a"] }),
    ).toBeGreaterThan(rankScore(active, { citySlug: "nairobi", goldenHour: true }));
    expect(rankScore(quiet, { citySlug: "nairobi", goldenHour: true, goldenPinnedIds: ["b"] })).toBe(
      rankScore(quiet, { citySlug: "nairobi", goldenHour: false }),
    );
  });
});

describe("tonight areas", () => {
  it("names areas from real impressions only", () => {
    const names = tonightAreaNames(
      [
        { profileId: "a", surface: "discover", at: 1 },
        { profileId: "a", surface: "profile", at: 2 },
        { profileId: "b", surface: "discover", at: 3 },
      ],
      [
        { id: "a", areaSlug: "westlands" },
        { id: "b", areaSlug: "kilimani" },
      ],
    );
    expect(names[0]).toBe("Westlands");
    expect(names).toContain("Kilimani");
  });
});

describe("live proof", () => {
  it("stays in-thread after a match", () => {
    expect(canRequestLiveProof(false, false)).toBe(false);
    expect(canRequestLiveProof(true, false)).toBe(true);
    expect(canRequestLiveProof(true, true)).toBe(false);
    const asked = requestLiveProof(null, "c1", "voice", "2026-09-01T12:00:00.000Z");
    expect(asked.kind).toBe("voice");
    const sent = sendLiveProof(asked, "c1", "voice", "2026-09-01T12:01:00.000Z");
    expect(liveProofLine(sent)).toContain("Not on Discover");
  });
});

describe("friend pass", () => {
  it("rejects a self-pass and accepts another code", () => {
    expect(normalizePass(" ab-12 ")).toBe("AB12");
    expect(canRedeem("MINE1", "MINE1")).toEqual({ ok: false, reason: "self" });
    expect(canRedeem("xx", "MINE1")).toEqual({ ok: false, reason: "invalid" });
    expect(canRedeem("FRIEND", "MINE1")).toEqual({ ok: true });
  });
});

