import { describe, expect, it } from "vitest";
import { PUBLIC_QUESTIONS, questionDeck, questionOfTheWeek } from "@/lib/growth/question";
import { PROMPT_CATEGORIES } from "@/lib/profile/prompts";

describe("question of the week", () => {
  it("never uses the dating-only category", () => {
    const mapenzi = PROMPT_CATEGORIES.find((c) => c.id === "mapenzi")!.prompts.map((p) => p.q);
    expect(PUBLIC_QUESTIONS.some((q) => mapenzi.includes(q))).toBe(false);
  });
  it("is the same all week and changes on Monday (Nairobi)", () => {
    const sunNight = Date.parse("2026-10-25T20:59:00Z"); // Sun 23:59 EAT
    const monMorning = Date.parse("2026-10-25T21:01:00Z"); // Mon 00:01 EAT
    const tue = Date.parse("2026-10-20T09:00:00Z");
    expect(questionOfTheWeek(tue)).toBe(questionOfTheWeek(Date.parse("2026-10-25T20:00:00Z")));
    expect(questionOfTheWeek(sunNight)).not.toBe(questionOfTheWeek(monMorning));
  });
  it("puts this week's question first with no repeats", () => {
    const deck = questionDeck();
    expect(deck[0]).toBe(questionOfTheWeek());
    expect(new Set(deck).size).toBe(deck.length);
  });
});
