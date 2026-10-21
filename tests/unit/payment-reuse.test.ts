import { describe, expect, it } from "vitest";
import { reusablePrompt, type PendingPrompt } from "@/lib/payments/reuse";

const now = Date.parse("2026-10-21T12:00:00Z");
const row = (over: Partial<PendingPrompt> = {}): PendingPrompt => ({
  id: "tx1",
  sku: "gold_week",
  phone: "254712345678",
  status: "pending",
  provider: "intasend",
  created_at: new Date(now - 30_000).toISOString(),
  amount: 149,
  currency: "KES",
  ...over,
});

describe("reusablePrompt", () => {
  it("reuses an open prompt for the same thing and number", () => {
    expect(reusablePrompt([row()], "gold_week", "254712345678", now)?.id).toBe("tx1");
  });
  it("sends a new prompt once the old one has expired", () => {
    expect(reusablePrompt([row({ created_at: new Date(now - 120_000).toISOString() })], "gold_week", "254712345678", now)).toBeNull();
  });
  it("sends a new prompt to a different number", () => {
    expect(reusablePrompt([row()], "gold_week", "254700000000", now)).toBeNull();
  });
  it("ignores other products, settled payments and card payments", () => {
    expect(reusablePrompt([row({ sku: "gold_month" })], "gold_week", "254712345678", now)).toBeNull();
    expect(reusablePrompt([row({ status: "failed" })], "gold_week", "254712345678", now)).toBeNull();
    expect(reusablePrompt([row({ provider: "paystack" })], "gold_week", "254712345678", now)).toBeNull();
  });
  it("needs a number", () => {
    expect(reusablePrompt([row()], "gold_week", null, now)).toBeNull();
  });
});
