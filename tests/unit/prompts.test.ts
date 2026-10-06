import { describe, expect, it } from "vitest";
import {
  MAX_PROMPT_ANSWER,
  PROMPT_CATEGORIES,
  PROMPT_QUESTIONS,
  promptHint,
  surprisePrompt,
} from "@/lib/profile/prompts";
import { looksLikePaidService } from "@/lib/safety/paid-services";
import { PROFILES } from "@/lib/data/seed";

describe("Kenyan prompt library", () => {
  it("has unique questions that fit the 80-character column", () => {
    expect(new Set(PROMPT_QUESTIONS).size).toBe(PROMPT_QUESTIONS.length);
    for (const q of PROMPT_QUESTIONS) expect(q.length, q).toBeLessThanOrEqual(80);
  });

  it("keeps every question that older profiles may already have answered", () => {
    for (const q of [
      "My ideal Sunday in the city",
      "The way to win me over is",
      "Best nyama choma spot, fight me",
      "I’m looking for someone who",
      "A green flag I look for",
      "My most Kenyan habit",
      "Two truths and a lie",
      "I geek out on",
      "Dating me is like",
      "The last song I had on repeat",
    ]) {
      expect(PROMPT_QUESTIONS).toContain(q);
    }
  });

  it("gives every prompt an example answer that would pass the paid-services filter", () => {
    for (const category of PROMPT_CATEGORIES) {
      for (const p of category.prompts) {
        expect(p.hint.length, p.q).toBeGreaterThan(0);
        expect(p.hint.length, p.q).toBeLessThanOrEqual(MAX_PROMPT_ANSWER);
        expect(looksLikePaidService(`${p.q} ${p.hint}`), p.q).toBe(false);
      }
    }
  });

  it("falls back to a generic hint for a question it doesn't know", () => {
    expect(promptHint("Something old")).toBe("Keep it short and real.");
    expect(promptHint("Two truths and a lie")).toMatch(/Mt Kenya/);
  });

  it("surprises you with a prompt you haven't used, and stops when none are left", () => {
    const taken = PROMPT_QUESTIONS.slice(1);
    expect(surprisePrompt(taken, () => 0.99)).toBe(PROMPT_QUESTIONS[0]);
    expect(surprisePrompt([...PROMPT_QUESTIONS])).toBeNull();
  });

  it("only uses library questions on the sample profiles", () => {
    for (const profile of PROFILES) {
      for (const p of profile.prompts ?? []) expect(PROMPT_QUESTIONS, profile.slug).toContain(p.q);
    }
  });
});
