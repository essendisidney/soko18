import { describe, expect, it } from "vitest";
import { contactSchema, normalizeContactPhone } from "@/lib/safety/contact";

describe("normalizeContactPhone", () => {
  it("accepts Kenyan and international numbers", () => {
    expect(normalizeContactPhone("0712 345 678")).toBe("+254712345678");
    expect(normalizeContactPhone("0112345678")).toBe("+254112345678");
    expect(normalizeContactPhone("254712345678")).toBe("+254712345678");
    expect(normalizeContactPhone("+44 7700 900123")).toBe("+447700900123");
  });
  it("refuses anything that isn't a phone number", () => {
    expect(normalizeContactPhone("12345")).toBeNull();
    expect(normalizeContactPhone("call me")).toBeNull();
    expect(normalizeContactPhone("+0123456789")).toBeNull();
  });
});

describe("contactSchema", () => {
  const ok = { lat: -1.28, lng: 36.82, name: "Wanjiru", phone: "0712345678" };
  it("passes a real contact", () => {
    expect(contactSchema.safeParse(ok).success).toBe(true);
  });
  it("refuses a message disguised as a name", () => {
    expect(contactSchema.safeParse({ ...ok, name: "Win KES 50,000! visit http://x.co" }).success).toBe(false);
  });
  it("refuses impossible locations", () => {
    expect(contactSchema.safeParse({ ...ok, lat: 200 }).success).toBe(false);
  });
});
