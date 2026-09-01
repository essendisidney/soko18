import { describe, expect, it } from "vitest";
import { bothSidesLine, bothSidesReady, canUnmask, unmaskLine } from "@/lib/trust/both-sides";

describe("ID both sides", () => {
  it("is ready only when both have identity", () => {
    expect(bothSidesReady(true, "verified")).toBe(true);
    expect(bothSidesReady(true, "pending")).toBe(false);
    expect(bothSidesReady(false, "verified")).toBe(false);
    expect(canUnmask(true, "verified")).toBe(true);
    expect(canUnmask(true, "none")).toBe(false);
    expect(unmaskLine(false, "none")).toContain("Live proof stays in this thread");
  });

  it("says who still needs to submit", () => {
    expect(bothSidesLine(true, "verified")).toBe("ID verified on both sides.");
    expect(bothSidesLine(true, "none")).toBe("They verified. Submit your ID.");
    expect(bothSidesLine(false, "none")).toBe("Neither of you is ID verified yet.");
  });
});
