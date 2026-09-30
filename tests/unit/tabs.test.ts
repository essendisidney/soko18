import { describe, expect, it } from "vitest";
import { browseTabHref, tabActive } from "@/lib/nav/tabs";

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
    expect(tabActive("/me", "/notify")).toBe(true);
    expect(tabActive("/matches", "/blocked")).toBe(false);
  });

  it("keeps Browse on waitlist city pages", () => {
    expect(tabActive("/kisumu", "/kisumu")).toBe(true);
    expect(tabActive("/kisumu", "/kisumu/milimani")).toBe(true);
    expect(tabActive("/kisumu", "/discover")).toBe(false);
    expect(tabActive("/nairobi", "/kisumu")).toBe(true);
  });

  it("points Browse at the snapped city", () => {
    expect(browseTabHref("/kisumu/milimani", "nairobi")).toBe("/kisumu");
    expect(browseTabHref("/discover", "kisumu")).toBe("/kisumu");
    expect(browseTabHref("/me", "nairobi")).toBe("/nairobi");
    expect(browseTabHref("/browse", "kisumu")).toBe("/kisumu");
  });

  it("keeps the last hub on a public profile", () => {
    expect(tabActive("/discover", "/profile/amani-nairobi")).toBe(true);
    expect(tabActive("/nairobi", "/profile/amani-nairobi")).toBe(false);
    expect(tabActive("/nairobi", "/profile/amani-nairobi", "/nairobi")).toBe(true);
    expect(tabActive("/discover", "/profile/amani-nairobi", "/nairobi")).toBe(false);
    expect(tabActive("/me", "/profile/amani-nairobi", "/saved")).toBe(true);
  });
});
