import { describe, expect, it } from "vitest";
import { tonightAreaNames } from "@/lib/nairobi/tonight";
import { canRedeem, normalizePass } from "@/lib/growth/referral";

describe("tonight areas", () => {
  it("names areas from real impressions only", () => {
    const names = tonightAreaNames(
      [
        { profileId: "a", surface: "discover", at: 1 },
        { profileId: "a", surface: "profile", at: 2 },
        { profileId: "b", surface: "discover", at: 3 },
      ],
      [
        { id: "a", areaSlug: "westlands" },
        { id: "b", areaSlug: "kilimani" },
      ],
    );
    expect(names[0]).toBe("Westlands");
    expect(names).toContain("Kilimani");
  });
});

describe("friend pass", () => {
  it("rejects a self-pass and accepts another code", () => {
    expect(normalizePass(" ab-12 ")).toBe("AB12");
    expect(canRedeem("MINE1", "MINE1")).toEqual({ ok: false, reason: "self" });
    expect(canRedeem("xx", "MINE1")).toEqual({ ok: false, reason: "invalid" });
    expect(canRedeem("FRIEND", "MINE1")).toEqual({ ok: true });
  });
});


describe("invite links", () => {
  it("builds a clean link and a WhatsApp message", async () => {
    const { inviteUrl, whatsappInviteUrl } = await import("@/lib/growth/referral");
    expect(inviteUrl("https://soko18.vercel.app/", " ab-c123 ")).toBe("https://soko18.vercel.app/?invite=ABC123");
    const wa = whatsappInviteUrl("https://soko18.vercel.app", "ABC123");
    expect(wa.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(wa)).toContain("?invite=ABC123");
  });
});

describe("intasend webhook challenge", () => {
  it("rejects when no challenge is configured or it doesn't match", async () => {
    const { intasendChallengeOk } = await import("@/lib/payments/intasend");
    delete process.env.INTASEND_WEBHOOK_CHALLENGE;
    expect(intasendChallengeOk("anything")).toBe(false);
    process.env.INTASEND_WEBHOOK_CHALLENGE = "s3cret-challenge";
    expect(intasendChallengeOk("nope")).toBe(false);
    expect(intasendChallengeOk(undefined)).toBe(false);
    expect(intasendChallengeOk("s3cret-challenge")).toBe(true);
    delete process.env.INTASEND_WEBHOOK_CHALLENGE;
  });
});
