import { describe, expect, it } from "vitest";
import { addUsage, autoSaver, formatBytes, saverOn } from "@/lib/data-saver/settings";

describe("data saver", () => {
  it("turns on by itself for save-data and 2G/3G", () => {
    expect(autoSaver({ saveData: true })).toBe(true);
    expect(autoSaver({ effectiveType: "3g" })).toBe(true);
    expect(autoSaver({ effectiveType: "slow-2g" })).toBe(true);
    expect(autoSaver({ effectiveType: "4g" })).toBe(false);
    expect(autoSaver(undefined)).toBe(false);
  });

  it("respects the member's choice over auto", () => {
    expect(saverOn("on", { effectiveType: "4g" })).toBe(true);
    expect(saverOn("off", { saveData: true })).toBe(false);
    expect(saverOn("auto", { saveData: true })).toBe(true);
  });

  it("counts today's data and starts fresh each day", () => {
    const first = addUsage(null, 500_000, "2026-10-23");
    const second = addUsage(JSON.stringify(first), 700_000, "2026-10-23");
    expect(second.bytes).toBe(1_200_000);
    expect(addUsage(JSON.stringify(second), 100, "2026-10-24").bytes).toBe(100);
    expect(addUsage("not json", 10, "2026-10-24").bytes).toBe(10);
    expect(formatBytes(1_200_000)).toBe("1.1 MB");
    expect(formatBytes(2048)).toBe("2 KB");
  });
});
