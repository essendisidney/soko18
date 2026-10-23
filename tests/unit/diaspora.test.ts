import { describe, expect, it } from "vitest";
import { awayLabel, countryName } from "@/lib/diaspora/label";
import { DIASPORA_SKUS, PRODUCTS } from "@/lib/payments/catalog";

describe("Home & Away", () => {
  it("labels members abroad honestly", () => {
    expect(awayLabel({ away_country: null, city_name: "Nairobi" })).toBeUndefined();
    expect(awayLabel({ away_country: "GB", home_city_name: "Nairobi", city_name: "Nairobi" })).toBe("Lives in the UK · from Nairobi");
    expect(awayLabel({ away_country: "US", home_city_name: null, city_name: "Mombasa" })).toBe("Lives in the US · from Mombasa");
    expect(awayLabel({ away_country: "GB", city_name: "Nairobi", visit_arrives: "2026-12-15" })).toBe("Visiting from the UK, 15 Dec");
    expect(countryName("DE")).toBe("Germany");
  });

  it("is sold only in diaspora markets, never in Kenya", () => {
    for (const sku of DIASPORA_SKUS) expect(PRODUCTS[sku].marketsOnly).toEqual(["GB", "US"]);
  });
});
