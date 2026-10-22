import { afterEach, describe, expect, it } from "vitest";
import { callbackTokenOk } from "@/lib/payments/daraja";

describe("callbackTokenOk", () => {
  afterEach(() => {
    delete process.env.MPESA_CALLBACK_SECRET;
  });
  it("accepts only the exact secret", () => {
    process.env.MPESA_CALLBACK_SECRET = "s3cret-value";
    expect(callbackTokenOk("s3cret-value")).toBe(true);
    expect(callbackTokenOk("s3cret-valuX")).toBe(false);
    expect(callbackTokenOk("short")).toBe(false);
    expect(callbackTokenOk(null)).toBe(false);
  });
  it("rejects everything when no secret is set", () => {
    expect(callbackTokenOk("")).toBe(false);
    expect(callbackTokenOk("anything")).toBe(false);
  });
});
