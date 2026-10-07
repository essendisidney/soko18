import { describe, expect, it } from "vitest";
import { countdown, liveNight, liveNightIcs } from "@/lib/live-night";

// Nairobi is UTC+3, so Sunday 20:00 EAT is Sunday 17:00 UTC. 2026-10-11 is a Sunday.
const at = (iso: string) => new Date(iso);

describe("live swipe night schedule", () => {
  it("points at the coming Sunday 8pm Nairobi during the week", () => {
    const night = liveNight(at("2026-10-07T09:00:00Z")); // Wednesday
    expect(night.live).toBe(false);
    expect(night.start.toISOString()).toBe("2026-10-11T17:00:00.000Z");
    expect(night.end.toISOString()).toBe("2026-10-11T19:00:00.000Z");
  });

  it("is live between 8 and 10pm Nairobi on Sunday", () => {
    expect(liveNight(at("2026-10-11T17:00:00Z")).live).toBe(true);
    expect(liveNight(at("2026-10-11T18:59:59Z")).live).toBe(true);
  });

  it("counts down earlier on Sunday", () => {
    const night = liveNight(at("2026-10-11T12:00:00Z")); // 3pm Nairobi
    expect(night.live).toBe(false);
    expect(night.start.toISOString()).toBe("2026-10-11T17:00:00.000Z");
  });

  it("moves to next week once it ends", () => {
    const night = liveNight(at("2026-10-11T19:00:00Z")); // 10pm Nairobi
    expect(night.live).toBe(false);
    expect(night.start.toISOString()).toBe("2026-10-18T17:00:00.000Z");
  });

  it("uses Nairobi's day, not UTC's, around midnight", () => {
    // Saturday 22:30 UTC is already Sunday 01:30 in Nairobi: tonight's night is the next one.
    expect(liveNight(at("2026-10-10T22:30:00Z")).start.toISOString()).toBe("2026-10-11T17:00:00.000Z");
    // Sunday 21:30 UTC is Monday 00:30 in Nairobi: next week.
    expect(liveNight(at("2026-10-11T21:30:00Z")).start.toISOString()).toBe("2026-10-18T17:00:00.000Z");
  });
});

describe("countdown", () => {
  it("reads naturally", () => {
    expect(countdown(30_000)).toBe("under a minute");
    expect(countdown(45 * 60_000)).toBe("45m");
    expect(countdown((2 * 60 + 5) * 60_000)).toBe("2h 05m");
    expect(countdown((2 * 24 * 60 + 4 * 60) * 60_000)).toBe("2d 4h");
  });
});

describe("calendar file", () => {
  it("repeats weekly from the next night with a reminder", () => {
    const ics = liveNightIcs("https://soko18.vercel.app", at("2026-10-07T09:00:00Z"));
    expect(ics).toContain("DTSTART:20261011T170000Z");
    expect(ics).toContain("DTEND:20261011T190000Z");
    expect(ics).toContain("RRULE:FREQ=WEEKLY");
    expect(ics).toContain("TRIGGER:-PT15M");
    expect(ics).toContain("https://soko18.vercel.app/discover");
  });
});
