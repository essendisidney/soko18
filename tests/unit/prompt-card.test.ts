import { describe, expect, it } from "vitest";
import { displayLink, fitFontSize, wrapLines } from "@/lib/share/prompt-card";

// Every character is 10px wide at size 10; width scales with font size.
const measureAt = (size: number) => (text: string) => text.length * size;

describe("share my prompt card", () => {
  it("wraps words onto lines that fit, never splitting a word", () => {
    expect(wrapLines("Chapati obviously ugali is for Sundays", 100, measureAt(10))).toEqual([
      "Chapati",
      "obviously",
      "ugali is",
      "for",
      "Sundays",
    ]);
    expect(wrapLines("  Supercalifragilistic  ", 50, measureAt(10))).toEqual(["Supercalifragilistic"]);
    expect(wrapLines("", 100, measureAt(10))).toEqual([]);
  });

  it("shrinks the answer until it fits, and trims with an ellipsis as a last resort", () => {
    const short = fitFontSize("Chapati, obviously", 900, 3, measureAt, [80, 40]);
    expect(short.size).toBe(80);
    const long = fitFontSize("word ".repeat(80).trim(), 300, 2, measureAt, [20, 10]);
    expect(long.size).toBe(10);
    expect(long.lines).toHaveLength(2);
    expect(long.lines[1].endsWith("…")).toBe(true);
  });

  it("shows links without the scheme", () => {
    expect(displayLink("https://kutana-app.vercel.app/campus/race/uon")).toBe("kutana-app.vercel.app/campus/race/uon");
    expect(displayLink("https://kutana-app.vercel.app/")).toBe("kutana-app.vercel.app");
  });
});
