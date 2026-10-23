import { describe, expect, it } from "vitest";
import { vouchLine } from "@/lib/trust/vouches";

describe("vouchLine", () => {
  it("names up to three friends", () => {
    expect(vouchLine({ count: 0, names: [] })).toBeNull();
    expect(vouchLine({ count: 1, names: ["Wanjiru"] })).toBe("Vouched by Wanjiru");
    expect(vouchLine({ count: 2, names: ["Wanjiru", "Otieno"] })).toBe("Vouched by Wanjiru and Otieno");
    expect(vouchLine({ count: 5, names: ["A", "B", "C"] })).toBe("Vouched by A, B, C and 2 more");
  });
  it("still counts friends whose names the viewer can't see", () => {
    expect(vouchLine({ count: 2, names: [] })).toBe("Vouched by 2 friends");
  });
});
