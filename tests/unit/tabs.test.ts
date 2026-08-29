import { describe, expect, it } from "vitest";
import { tabActive } from "@/lib/nav/tabs";

describe("tab bar", () => {
  it("keeps Matches on when you are in a thread", () => {
    expect(tabActive("/matches", "/matches")).toBe(true);
    expect(tabActive("/matches", "/messages/amani-nairobi")).toBe(true);
    expect(tabActive("/matches", "/messages")).toBe(true);
    expect(tabActive("/discover", "/messages/amani-nairobi")).toBe(false);
  });

  it("does not steal Discover or Me", () => {
    expect(tabActive("/discover", "/discover")).toBe(true);
    expect(tabActive("/me", "/blocked")).toBe(true);
    expect(tabActive("/matches", "/blocked")).toBe(false);
  });
});
