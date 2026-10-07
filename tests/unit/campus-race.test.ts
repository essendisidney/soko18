import { describe, expect, it } from "vitest";
import { rankRace, raceShareText, raceUrl, rivalOf, whatsappHref } from "@/lib/campus/race";
import type { CampusBoardRow } from "@/lib/campus/shared";

const row = (slug: string, joined: number, status: "live" | "waitlist" = "waitlist", target = 200): CampusBoardRow => ({
  slug,
  name: slug.toUpperCase() + " University",
  shortName: slug.toUpperCase(),
  town: "Nairobi",
  status,
  joined,
  target,
  openedAt: status === "live" ? "2026-10-01T00:00:00Z" : null,
  daysToOpen: status === "live" ? 9 : null,
});

const board = [row("ku", 40), row("uon", 120), row("jkuat", 120), row("strath", 200, "live"), row("moi", 3)];
const origin = "https://soko18.vercel.app";

describe("campus race", () => {
  it("puts open campuses first, then ranks the rest by verified students (ties by name)", () => {
    const race = rankRace(board);
    expect(race.map((r) => r.slug)).toEqual(["strath", "jkuat", "uon", "ku", "moi"]);
    expect(race.map((r) => r.place)).toEqual([null, 1, 2, 3, 4]);
    expect(race.find((r) => r.slug === "ku")?.toGo).toBe(160);
    expect(race.find((r) => r.slug === "strath")?.toGo).toBe(0);
  });

  it("picks the campus just ahead as the rival, or just behind for the leader", () => {
    const race = rankRace(board);
    expect(rivalOf(race, "ku")?.slug).toBe("uon");
    expect(rivalOf(race, "jkuat")?.slug).toBe("uon");
    expect(rivalOf(race, "strath")).toBeNull();
    expect(rivalOf(race, "nope")).toBeNull();
  });

  it("writes share text with real counts and a real rival", () => {
    const race = rankRace(board);
    const ku = raceShareText(race, "ku", origin);
    expect(ku).toContain("KU needs 160 more students to open on Kutana (40 of 200 in)");
    expect(ku).toContain("UON is ahead with 120");
    expect(ku).toContain(`${origin}/campus/race/ku`);
    expect(raceShareText(race, "jkuat", origin)).toContain("We're ahead of UON (120)");
    expect(raceShareText(race, "strath", origin)).toContain("STRATH is open on Kutana");
  });

  it("says '1 more student' and has no rival when racing alone", () => {
    const race = rankRace([row("tuk", 199)]);
    const text = raceShareText(race, "tuk", origin);
    expect(text).toContain("needs 1 more student");
    expect(text).not.toContain("ahead");
  });

  it("invites the first student instead of counting from zero, and ignores empty rivals", () => {
    const race = rankRace([row("uon", 0, "waitlist", 300), row("ku", 0, "waitlist", 300), row("moi", 5)]);
    expect(raceShareText(race, "uon", origin)).toBe(
      `Be the first UON student on Kutana. UON opens when 300 students verify with their student email 🎓 ${origin}/campus/race/uon`,
    );
    expect(rivalOf(race, "moi")).toBeNull();
    expect(raceShareText(race, "moi", origin)).not.toContain("ahead");
  });

  it("builds links", () => {
    expect(raceUrl(origin)).toBe(`${origin}/campus/race`);
    expect(whatsappHref("a b&c")).toBe("https://wa.me/?text=a%20b%26c");
  });
});
