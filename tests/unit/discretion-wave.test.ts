import { describe, expect, it } from "vitest";
import { filterGhosts, seedIncognitoIds } from "@/lib/privacy/incognito";
import { mysteryPick } from "@/lib/privacy/mystery";
import { getDiscoverFeed } from "@/lib/discovery/feed";
import { searchNairobi } from "@/lib/browse/feed";
import { liveProofLine, requestLiveProof, sendLiveProof } from "@/lib/trust/live-proof";
import { testProfile } from "../helpers/profile";

describe("incognito on the feed", () => {
  it("hides ghosts unless they already liked you", () => {
    const ghost = testProfile({ id: "ghost", slug: "ghost", incognito: true });
    const open = testProfile({ id: "open", slug: "open" });
    expect(seedIncognitoIds([ghost, open])).toEqual(["ghost"]);
    expect(filterGhosts([ghost, open], ["ghost"], []).map((row) => row.id)).toEqual(["open"]);
    expect(filterGhosts([ghost], ["ghost"], ["ghost"]).map((row) => row.id)).toEqual(["ghost"]);
  });

  it("drops seed ghosts from Discover and Nairobi search", () => {
    const deck = getDiscoverFeed({ citySlug: "nairobi", gender: "man" });
    expect(deck.items.some((row) => row.id === "m6")).toBe(false);
    expect(deck.items.length).toBeGreaterThan(0);
    expect(searchNairobi("").some((row) => row.id === "p13")).toBe(false);
    expect(searchNairobi("Lulu")).toEqual([]);
  });
});

describe("mystery pick", () => {
  it("is one card and never an excluded id", () => {
    expect(mysteryPick([{ id: "a" }, { id: "b" }], ["a"])?.id).toBe("b");
    expect(mysteryPick([{ id: "a" }], ["a"])).toBeNull();
  });
});

describe("voice proof", () => {
  it("stays in the thread", () => {
    const asked = requestLiveProof(null, "c1", "voice", "2026-09-01T12:00:00.000Z");
    expect(liveProofLine(asked)).toContain("Live voice asked");
    const sent = sendLiveProof(asked, "c1", "voice", "2026-09-01T12:01:00.000Z");
    expect(liveProofLine(sent)).toContain("Not on Discover");
  });
});
