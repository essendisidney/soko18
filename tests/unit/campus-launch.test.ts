import { describe, expect, it } from "vitest";
import { launchNight } from "@/lib/campus/launch";

describe("launchNight", () => {
  it("promises a launch night while a campus is still racing", () => {
    expect(launchNight({ status: "collecting", openedAt: null } as never)).toEqual({ kind: "promise" });
  });
  it("is the first Sunday live night after opening", () => {
    // Opened Wed 21 Oct 2026; next live night is Sun 25 Oct 20:00 EAT = 17:00 UTC.
    const night = launchNight({ status: "live", openedAt: "2026-10-21T10:00:00Z" }, new Date("2026-10-22T10:00:00Z"));
    expect(night && night.kind === "upcoming" ? night.start.toISOString() : null).toBe("2026-10-25T17:00:00.000Z");
  });
  it("disappears once that night is over", () => {
    expect(launchNight({ status: "live", openedAt: "2026-10-21T10:00:00Z" }, new Date("2026-10-25T19:30:00Z"))).toBeNull();
  });
});
