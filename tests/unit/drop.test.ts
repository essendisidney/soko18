import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hoursLeft } from "@/lib/drop/shared";

describe("daily drop", () => {
  it("counts the hours left, rounded up, and nothing once gone", () => {
    const now = Date.parse("2026-10-23T18:00:00.000Z");
    expect(hoursLeft("2026-10-23T23:30:00.000Z", now)).toBe(6);
    expect(hoursLeft("2026-10-23T18:20:00.000Z", now)).toBe(1);
    expect(hoursLeft("2026-10-23T17:59:00.000Z", now)).toBeNull();
    expect(hoursLeft(null, now)).toBeNull();
    expect(hoursLeft("not a date", now)).toBeNull();
  });

  it("runs in the 8pm Nairobi hour", () => {
    const crons = (JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] }).crons;
    const drop = crons.find((c) => c.path === "/api/cron/drop");
    expect(drop?.schedule.split(" ")[1]).toBe("17"); // 17:xx UTC = 20:xx EAT
  });
});
