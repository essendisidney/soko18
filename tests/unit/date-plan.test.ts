import { describe, expect, it } from "vitest";
import { defaultCheckIn, toLocalInput, untilLabel } from "@/lib/safety/date-plan-shared";
import { outboxText } from "@/lib/safety/outbox-text";
import { looksLikePaidService } from "@/lib/safety/paid-services";

describe("date plan", () => {
  it("defaults the check-in to three hours after the date", () => {
    const at = new Date("2026-10-23T16:00:00.000Z");
    expect(defaultCheckIn(at).toISOString()).toBe("2026-10-23T19:00:00.000Z");
  });

  it("formats a datetime-local value", () => {
    expect(toLocalInput(new Date(2026, 9, 23, 7, 5))).toBe("2026-10-23T07:05");
  });

  it("says how long until check-in", () => {
    const now = Date.parse("2026-10-23T16:00:00.000Z");
    expect(untilLabel("2026-10-23T16:05:00.000Z", now)).toBe("in 5 min");
    expect(untilLabel("2026-10-23T18:15:00.000Z", now)).toBe("in 2h 15m");
    expect(untilLabel("2026-10-23T15:00:00.000Z", now)).toBe("now");
  });

  it("tells the contact what they need, with emergency numbers, and nothing from chats", () => {
    const missed = outboxText({ kind: "missed_checkin", member_name: "Pendo", place: "Java House, Westlands", starts_at: "2026-10-23T16:00:00.000Z" });
    expect(missed).toMatch(/Pendo/);
    expect(missed).toMatch(/Java House, Westlands/);
    expect(missed).toMatch(/19:00|7:00/); // 16:00 UTC is 19:00 in Nairobi
    expect(missed).toMatch(/999 or 112/);
    expect(looksLikePaidService(missed)).toBe(false);
    expect(outboxText({ kind: "all_clear", member_name: "Pendo", place: "x", starts_at: "2026-10-23T16:00:00.000Z" })).toMatch(/is safe/);
  });
});

describe("sms", async () => {
  const { smsReady, smsText } = await import("@/lib/sms/send");
  it("is off until keys are set and keeps alerts short", () => {
    expect(smsReady()).toBe(false);
    expect(smsText("a   b\n c")).toBe("a b c");
    expect(smsText("x".repeat(600)).length).toBeLessThanOrEqual(459);
  });
});
