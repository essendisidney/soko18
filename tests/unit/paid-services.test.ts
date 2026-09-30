import { describe, expect, it } from "vitest";
import { looksLikePaidService } from "@/lib/safety/paid-services";
import { normalizeKenyanPhone } from "@/lib/payments/daraja";
import { parseStkCallback } from "@/lib/payments/callback";

describe("paid-services filter", () => {
  it("flags rates, escort terms and fare-first asks", () => {
    for (const text of [
      "Incall and outcall available",
      "my rates: 3000 per shot",
      "5k per hour, 15k overnight",
      "Ksh 2000/hr",
      "send fare first",
      "happy ending massage",
      "short time or long time?",
      "Sponsor wanted",
    ]) {
      expect(looksLikePaidService(text), text).toBe(true);
    }
  });

  it("leaves ordinary dating profiles alone", () => {
    for (const text of [
      "Looking for something long term. Love nyama choma on weekends.",
      "Coffee first? I know a great spot in Westlands.",
      "Engineer who cooks. Will make you pilau on the second date.",
      "I work long hours but weekends are mine",
      "Let's split the bill, I insist",
    ]) {
      expect(looksLikePaidService(text), text).toBe(false);
    }
  });
});

describe("M-Pesa helpers", () => {
  it("normalizes Kenyan mobile numbers", () => {
    expect(normalizeKenyanPhone("0712 345 678")).toBe("254712345678");
    expect(normalizeKenyanPhone("+254712345678")).toBe("254712345678");
    expect(normalizeKenyanPhone("0110 123 456")).toBe("254110123456");
    expect(normalizeKenyanPhone("12345")).toBeNull();
  });

  it("parses a successful STK callback", () => {
    const result = parseStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: "m",
          CheckoutRequestID: "ws_CO_1",
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 499 },
              { Name: "MpesaReceiptNumber", Value: "QKX1ABC2DE" },
              { Name: "TransactionDate", Value: 20260930120000 },
              { Name: "PhoneNumber", Value: 254712345678 },
            ],
          },
        },
      },
    });
    expect(result).toEqual({
      ok: true,
      checkoutRequestId: "ws_CO_1",
      receipt: "QKX1ABC2DE",
      amountKes: 499,
      phone: "254712345678",
    });
  });

  it("parses a cancelled STK callback", () => {
    const result = parseStkCallback({
      Body: { stkCallback: { CheckoutRequestID: "ws_CO_2", ResultCode: 1032, ResultDesc: "Request cancelled by user" } },
    });
    expect(result).toEqual({ ok: false, checkoutRequestId: "ws_CO_2", description: "Request cancelled by user" });
    expect(parseStkCallback({ nope: true })).toBeNull();
  });
});
