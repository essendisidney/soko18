import { describe, expect, it } from "vitest";
import { nairobiDay, streakLine } from "@/lib/growth/streak";

describe("streakLine", () => {
  it("stays quiet on day 1 and most days", () => {
    expect(streakLine({ days: 1, every: 5, gift: false })).toBeNull();
    expect(streakLine({ days: 2, every: 5, gift: false })).toBeNull();
    expect(streakLine(null)).toBeNull();
  });
  it("says so the day before a gift", () => {
    expect(streakLine({ days: 4, every: 5, gift: false })).toContain("Come back tomorrow");
  });
  it("celebrates the gift", () => {
    expect(streakLine({ days: 5, every: 5, gift: true })).toContain("free Super Like is yours");
  });
});

describe("nairobiDay", () => {
  it("uses Nairobi time, not the phone's UTC date", () => {
    expect(nairobiDay(new Date("2026-10-21T22:30:00Z"))).toBe("2026-10-22");
  });
});
