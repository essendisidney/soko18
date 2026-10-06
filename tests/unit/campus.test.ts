import { describe, expect, it } from "vitest";
import { CAMPUS_SLUG, campusDeckOpen, campusProgress, campusReason } from "@/lib/campus/shared";
import { COMRADE_SKUS, PRODUCTS, type Product } from "@/lib/payments/catalog";

describe("campus copy and progress", () => {
  it("explains every reason the database can return", () => {
    for (const code of ["unauthorized", "adult_only", "already", "not_campus", "taken", "wait", "limit", "expired", "wrong", "locked", "email_unavailable"]) {
      expect(campusReason(code)).not.toBe(campusReason("invalid"));
    }
    expect(campusReason("something_new")).toBe(campusReason("invalid"));
  });

  it("keeps the 18+ rule in the copy", () => {
    expect(campusReason("adult_only")).toMatch(/18/);
  });

  it("shows real progress, never past 100% and never an invisible bar", () => {
    expect(campusProgress(0, 300)).toBe(3);
    expect(campusProgress(150, 300)).toBe(50);
    expect(campusProgress(400, 300)).toBe(100);
    expect(campusProgress(5, 0)).toBe(100);
  });

  it("accepts only plain campus slugs", () => {
    expect(CAMPUS_SLUG.test("uon")).toBe(true);
    expect(CAMPUS_SLUG.test("dekut")).toBe(true);
    expect(CAMPUS_SLUG.test("UoN")).toBe(false);
    expect(CAMPUS_SLUG.test("uon,ku")).toBe(false);
  });
});

describe("campus deck and Comrade Gold", () => {
  const base = {
    slug: "uon",
    name: "University of Nairobi",
    shortName: "UoN",
    joined: 300,
    target: 300,
    showOnProfile: true,
    method: "login_email" as const,
    verifiedAt: "2026-10-05T00:00:00Z",
  };

  it("opens the campus deck only for an open campus you aren't hiding from", () => {
    expect(campusDeckOpen({ ...base, status: "live", hideFromCampus: false })).toBe(true);
    expect(campusDeckOpen({ ...base, status: "waitlist", hideFromCampus: false })).toBe(false);
    expect(campusDeckOpen({ ...base, status: "live", hideFromCampus: true })).toBe(false);
    expect(campusDeckOpen(null)).toBe(false);
  });

  it("sells Comrade Gold as ordinary Gold, for students only, below the regular price", () => {
    for (const sku of COMRADE_SKUS) {
      const product: Product = PRODUCTS[sku];
      expect(product.requiresCampus).toBe(true);
      expect(product.kind).toBe("plan");
      expect(product.plan).toBe("gold");
    }
    expect(PRODUCTS.comrade_week.amountKes).toBeLessThan(PRODUCTS.gold_week.amountKes);
    expect(PRODUCTS.comrade_month.amountKes).toBeLessThan(PRODUCTS.gold_month.amountKes);
    const regular: Product = PRODUCTS.gold_month;
    expect(regular.requiresCampus).toBeUndefined();
  });
});
