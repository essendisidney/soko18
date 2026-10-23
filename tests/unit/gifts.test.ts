import { describe, expect, it } from "vitest";
import { GIFT_SKUS, ledgerPurpose, PRODUCTS, type Sku } from "@/lib/payments/catalog";

describe("gifts", () => {
  it("cost exactly what the perk costs, no discount", () => {
    for (const sku of GIFT_SKUS) {
      const perk = PRODUCTS[PRODUCTS[sku].giftOf as Sku];
      expect(PRODUCTS[sku].amountKes, sku).toBe(perk.amountKes);
      expect(ledgerPurpose(PRODUCTS[sku]), sku).toBe(ledgerPurpose(perk));
    }
  });

  it("are only Kutana perks: Super Likes, a Boost or a Gold week", () => {
    expect(GIFT_SKUS.map((sku) => PRODUCTS[sku].giftOf)).toEqual(["super_5", "boost_1", "gold_week"]);
    for (const sku of GIFT_SKUS) expect(PRODUCTS[sku].title).not.toMatch(/airtime|cash|bundle|m-?pesa/i);
  });
});
