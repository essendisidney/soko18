import { describe, expect, it } from "vitest";
import { PLAN_SKUS, PRODUCTS } from "@/lib/payments/catalog";

// K0 price list (docs/KUTANA_NEXT.md). If these change, the plan changed: update both together.
describe("K0 prices", () => {
  it("matches the price list", () => {
    expect(PRODUCTS.gold_day.amountKes).toBe(39);
    expect(PRODUCTS.gold_day.days).toBe(1);
    expect(PRODUCTS.gold_week.amountKes).toBe(149);
    expect(PRODUCTS.gold_month.amountKes).toBe(499);
    expect(PRODUCTS.gold_week_student.amountKes).toBe(99);
    expect(PRODUCTS.platinum_month.amountKes).toBe(1299);
    expect(PRODUCTS.boost_1.amountKes).toBe(99);
    expect(PRODUCTS.boost_5.amountKes).toBe(399);
    expect(PRODUCTS.super_1.amountKes).toBe(49);
    expect(PRODUCTS.super_5.amountKes).toBe(199);
    expect(PRODUCTS.incognito_month.amountKes).toBe(299);
  });
  it("student Gold is server-checked and Comrade Gold is gone", () => {
    expect(PRODUCTS.gold_week_student.requiresCampus).toBe(true);
    expect(Object.keys(PRODUCTS).some((sku) => sku.startsWith("comrade"))).toBe(false);
    expect(PLAN_SKUS).toContain("gold_day");
  });
});
