import { describe, expect, it } from "vitest";
import { PRODUCTS, SALAMU_SKUS, SKUS, ledgerPurpose } from "@/lib/payments/catalog";
import { salamuCostLine } from "@/components/profile/send-intro";

describe("Salamu", () => {
  it("is priced as K0 says: 59, or 5 for 249", () => {
    expect(PRODUCTS.salamu_1.amountKes).toBe(59);
    expect(PRODUCTS.salamu_5.amountKes).toBe(249);
    expect(PRODUCTS.salamu_5.quantity).toBe(5);
    for (const sku of SALAMU_SKUS) {
      expect(PRODUCTS[sku].kind).toBe("salamu");
      expect(ledgerPurpose(PRODUCTS[sku])).toBe("salamu");
    }
  });

  it("always costs more than a Super Like, per message", () => {
    expect(PRODUCTS.salamu_1.amountKes).toBeGreaterThan(PRODUCTS.super_1.amountKes);
    expect(PRODUCTS.salamu_5.amountKes / 5).toBeGreaterThan(PRODUCTS.super_5.amountKes / 5);
    expect(PRODUCTS.salamu_5.amountKes / 5).toBeLessThan(PRODUCTS.salamu_1.amountKes);
  });

  it("is a SKU checkout accepts", () => {
    expect(SKUS).toContain("salamu_1");
    expect(SKUS).toContain("salamu_5");
  });

  it("says what sending costs", () => {
    expect(salamuCostLine(null)).toBeNull();
    expect(salamuCostLine({ plan: "platinum", salamu: 0 })).toMatch(/Included with Platinum/);
    expect(salamuCostLine({ plan: "gold", salamu: 2 })).toBe("Uses 1 Salamu · you have 2.");
    expect(salamuCostLine({ plan: null })).toBe("A Salamu is KES 59, or 5 for KES 249.");
  });
});
