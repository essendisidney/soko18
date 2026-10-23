import { describe, expect, it } from "vitest";
import { parseLikeAfterPay, purchaseCovers } from "@/lib/likes/after-pay";
import { storeStart } from "@/lib/payments/store-start";
import { parseDobHandoff } from "@/lib/onboarding";

const now = Date.parse("2026-10-21T12:00:00Z");

describe("storeStart", () => {
  it("opens on the plan the button promised", () => {
    expect(storeStart("gold_week")).toEqual({ tier: "gold", sku: "gold_week" });
    expect(storeStart("platinum_month")).toEqual({ tier: "platinum", sku: "platinum_month" });
  });
  it("falls back to Gold 30 days for anything else", () => {
    expect(storeStart(null)).toEqual({ tier: "gold", sku: "gold_month" });
    expect(storeStart("boost_1")).toEqual({ tier: "gold", sku: "gold_month" });
    expect(storeStart("<script>")).toEqual({ tier: "gold", sku: "gold_month" });
  });
});

describe("like after paying", () => {
  const raw = (over: object = {}) =>
    JSON.stringify({ profileId: "p1", name: "Wanjiru", kind: "like", code: "like_limit", at: now - 60_000, ...over });

  it("reads a recent stopped like", () => {
    expect(parseLikeAfterPay(raw(), now)?.profileId).toBe("p1");
  });
  it("drops old, broken or odd rows", () => {
    expect(parseLikeAfterPay(raw({ at: now - 31 * 60_000 }), now)).toBeNull();
    expect(parseLikeAfterPay(raw({ kind: "pass" }), now)).toBeNull();
    expect(parseLikeAfterPay("{oops", now)).toBeNull();
    expect(parseLikeAfterPay(null, now)).toBeNull();
  });
  it("only sends it when the purchase covers it", () => {
    expect(purchaseCovers("gold_week", { code: "like_limit" })).toBe(true);
    expect(purchaseCovers("gold_week_student", { code: "no_super_likes" })).toBe(true);
    expect(purchaseCovers("super_1", { code: "no_super_likes" })).toBe(true);
    expect(purchaseCovers("super_1", { code: "like_limit" })).toBe(false);
    expect(purchaseCovers("boost_1", { code: "like_limit" })).toBe(false);
  });
});

describe("date of birth handoff", () => {
  it("pre-fills within two hours", () => {
    expect(parseDobHandoff(JSON.stringify({ dob: "2000-05-01", at: now - 60_000 }), now)).toBe("2000-05-01");
  });
  it("forgets it after two hours, or if it's malformed", () => {
    expect(parseDobHandoff(JSON.stringify({ dob: "2000-05-01", at: now - 3 * 3600_000 }), now)).toBe("");
    expect(parseDobHandoff(JSON.stringify({ dob: "yesterday", at: now }), now)).toBe("");
    expect(parseDobHandoff("2000-05-01", now)).toBe("");
  });
});
