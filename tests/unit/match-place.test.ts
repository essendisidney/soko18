import { describe, expect, it } from "vitest";
import { matchPlaceName } from "@/lib/likes/list";

describe("match place", () => {
  it("uses the listed area, then the city, never a Nairobi stamp", () => {
    expect(matchPlaceName("Milimani", "Kisumu")).toBe("Milimani");
    expect(matchPlaceName(null, "Kisumu")).toBe("Kisumu");
    expect(matchPlaceName(undefined, undefined)).toBe("Kenya");
  });
});
