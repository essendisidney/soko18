import { describe, expect, it } from "vitest";
import { canEngage, missingToGoLive } from "@/lib/profile/ready";

describe("going live", () => {
  it("lists everything when there is no profile", () => {
    expect(missingToGoLive(null, 0)).toHaveLength(5);
  });
  it("needs a photo even when the form is complete", () => {
    expect(missingToGoLive({ displayName: "Amina", areaSlug: "nyali", gender: "woman", lookingFor: "relationship" }, 0)).toEqual(["a photo"]);
  });
  it("is ready with one photo and the four details", () => {
    expect(missingToGoLive({ displayName: "Amina", areaSlug: "nyali", gender: "woman", lookingFor: "relationship" }, 1)).toEqual([]);
  });
  it("only lets live (or checking) members like", () => {
    expect(canEngage(null)).toBe(false);
    expect(canEngage({ status: "draft" })).toBe(false);
    expect(canEngage({ status: "live" })).toBe(true);
    expect(canEngage({ status: "pending_review" })).toBe(true);
  });
});
