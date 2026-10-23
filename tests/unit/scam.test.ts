import { describe, expect, it } from "vitest";
import { SCAM_NOTICE, scamNotice } from "@/lib/safety/scam";
import { looksLikePaidService } from "@/lib/safety/paid-services";

describe("scam guard notice", () => {
  it("only shows for a known flag", () => {
    expect(scamNotice("money")).toMatch(/M-Pesa/);
    expect(scamNotice("off_platform")).toMatch(/off Kutana/);
    expect(scamNotice(null)).toBeNull();
    expect(scamNotice("other")).toBeNull();
  });

  it("stays calm: no accusing words, nothing the paid-services filter would hold", () => {
    for (const text of Object.values(SCAM_NOTICE)) {
      expect(text).not.toMatch(/scam|fraud|criminal/i);
      expect(looksLikePaidService(text)).toBe(false);
    }
  });
});
