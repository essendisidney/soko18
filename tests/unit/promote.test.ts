import { describe, expect, it } from "vitest";
import { profileCanPromote } from "@/lib/studio/promote";

describe("studio promote", () => {
  it("only sells placement on a live Nairobi profile", () => {
    expect(profileCanPromote("live")).toBe(true);
    expect(profileCanPromote("pending_review")).toBe(false);
    expect(profileCanPromote("draft")).toBe(false);
    expect(profileCanPromote(null)).toBe(false);
  });
});
