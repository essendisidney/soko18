import { afterEach, describe, expect, it } from "vitest";
import { areaUrl, nairobiUrl, profileUrl } from "@/lib/profile/share";

describe("share urls", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.window;
  });

  it("points guests at Nairobi, not a fake city count", () => {
    expect(nairobiUrl()).toBe("/nairobi");
    expect(areaUrl("kilimani")).toBe("/nairobi/kilimani");
    expect(profileUrl("amani-nairobi")).toBe("/profile/amani-nairobi");
  });

  it("uses the current origin in the browser", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { origin: "https://soko18.vercel.app" } },
    });
    expect(nairobiUrl()).toBe("https://soko18.vercel.app/nairobi");
  });
});
