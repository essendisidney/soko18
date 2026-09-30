import { describe, expect, it } from "vitest";
import { appendLedger, boostUntil, formatKes, ledgerBalanced } from "@/lib/payments/ledger";
import {
  FREE_DAILY_LIKES,
  ledgerPurpose,
  PLAN_SKUS,
  PRODUCTS,
  SKUS,
} from "@/lib/payments/catalog";

describe("catalog", () => {
  it("prices plans for M-Pesa, not for agencies", () => {
    expect(PRODUCTS.gold_week.amountKes).toBe(149);
    expect(PRODUCTS.gold_month.amountKes).toBe(499);
    expect(PRODUCTS.platinum_month.amountKes).toBe(999);
    expect(PRODUCTS.boost_1.amountKes).toBe(99);
    expect(PRODUCTS.super_1.amountKes).toBe(49);
    expect(PRODUCTS.incognito_month.amountKes).toBe(299);
    for (const sku of SKUS) expect(PRODUCTS[sku].amountKes).toBeLessThan(1000);
    expect(FREE_DAILY_LIKES).toBe(30);
  });

  it("bundles are cheaper per unit than singles", () => {
    expect(PRODUCTS.boost_5.amountKes / 5).toBeLessThan(PRODUCTS.boost_1.amountKes);
    expect(PRODUCTS.super_5.amountKes / 5).toBeLessThan(PRODUCTS.super_1.amountKes);
    expect(PRODUCTS.gold_month.amountKes).toBeLessThan(PRODUCTS.gold_week.amountKes * 4);
  });

  it("writes a ledger purpose the database enum accepts", () => {
    const allowed = new Set(["gold", "platinum", "boost", "super_like", "incognito"]);
    for (const sku of SKUS) expect(allowed.has(ledgerPurpose(PRODUCTS[sku]))).toBe(true);
    for (const sku of PLAN_SKUS) expect(PRODUCTS[sku].kind).toBe("plan");
  });
});

describe("ledger", () => {
  it("balances a settled payment", () => {
    const rows = appendLedger(
      appendLedger([], {
        id: "l1",
        accountId: "a",
        transactionId: "t1",
        type: "payment",
        amountKes: 499,
        direction: "debit",
      }),
      { id: "l2", accountId: "a", transactionId: "t1", type: "gold", amountKes: 499, direction: "credit" },
    );
    expect(ledgerBalanced(rows, "t1")).toBe(true);
    expect(ledgerBalanced(rows.slice(0, 1), "t1")).toBe(false);
    expect(ledgerBalanced(rows, "missing")).toBe(false);
  });

  it("stacks boosts end to end", () => {
    const now = "2026-09-30T12:00:00.000Z";
    expect(boostUntil(null, now, 30)).toBe("2026-09-30T12:30:00.000Z");
    expect(boostUntil("2026-09-30T12:10:00.000Z", now, 30)).toBe("2026-09-30T12:40:00.000Z");
    expect(boostUntil("2026-09-30T11:00:00.000Z", now, 30)).toBe("2026-09-30T12:30:00.000Z");
  });

  it("formats shillings", () => {
    expect(formatKes(1499)).toBe("KES 1,499");
  });
});
