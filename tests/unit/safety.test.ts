import { describe, expect, it } from "vitest";
import { applyFlag, hideBlocked, toggleFlag } from "@/lib/safety/flags";

describe("saved and blocked flags", () => {
  it("toggles a favorite without inventing extras", () => {
    const added = toggleFlag([], "p1");
    expect(added.on).toBe(true);
    expect(added.ids).toEqual(["p1"]);
    const removed = toggleFlag(added.ids, "p1");
    expect(removed.on).toBe(false);
    expect(removed.ids).toEqual([]);
  });

  it("keeps newest first and caps the list", () => {
    const ids = applyFlag(["p1"], "p2", true);
    expect(ids[0]).toBe("p2");
    expect(applyFlag(["p2", "p1"], "p2", false)).toEqual(["p1"]);
  });

  it("hides blocked profiles from a feed", () => {
    const visible = hideBlocked(
      [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
      ["p2"],
    );
    expect(visible.map((row) => row.id)).toEqual(["p1", "p3"]);
  });
});
