import { describe, expect, it } from "vitest";
import { posterQrSvg } from "@/lib/campus/poster";

describe("posterQrSvg", () => {
  it("makes an SVG QR code", async () => {
    const svg = await posterQrSvg("https://kutana-app.vercel.app/campus/race/uon");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("path");
  });
});
