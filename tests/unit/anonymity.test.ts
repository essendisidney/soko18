import { describe, expect, it } from "vitest";
import { ghostVisible, filterGhosts } from "@/lib/privacy/incognito";
import { blockedByHash, hashContact, normalizeKePhone } from "@/lib/privacy/contacts";
import { mysteryPick } from "@/lib/privacy/mystery";
import { chatExpiresAt, chatOpen, extendChat, remainingLabel } from "@/lib/messages/expiry";
import { extendReady, recordExtendTap } from "@/lib/messages/extend";

describe("incognito", () => {
  it("hides a ghost unless they already liked you", () => {
    expect(ghostVisible(true, false)).toBe(false);
    expect(ghostVisible(true, true)).toBe(true);
    expect(ghostVisible(false, false)).toBe(true);
    expect(filterGhosts([{ id: "a" }, { id: "b" }], ["a"], []).map((row) => row.id)).toEqual(["b"]);
    expect(filterGhosts([{ id: "a" }], ["a"], ["a"]).map((row) => row.id)).toEqual(["a"]);
  });
});

describe("contact hashes", () => {
  it("normalizes Kenyan numbers and never stores the raw digits", async () => {
    expect(normalizeKePhone("0712 345 678")).toBe("254712345678");
    expect(normalizeKePhone("not-a-phone")).toBeNull();
    const hash = await hashContact("+254712345678");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("712345678");
    expect(blockedByHash(hash, [hash!])).toBe(true);
    expect(blockedByHash(hash, [])).toBe(false);
  });
});

describe("24-hour chats", () => {
  it("expires after 24h and extend starts a new day", () => {
    const opened = "2026-08-24T12:00:00.000Z";
    const expires = chatExpiresAt(opened);
    expect(chatOpen(expires, "2026-08-25T11:59:00.000Z")).toBe(true);
    expect(chatOpen(expires, "2026-08-25T12:00:00.000Z")).toBe(false);
    expect(remainingLabel(expires, "2026-08-25T11:00:00.000Z")).toBe("1h 0m left");
    const next = extendChat("2026-08-25T12:00:00.000Z");
    expect(chatOpen(next, "2026-08-26T11:59:00.000Z")).toBe(true);
    expect(extendReady([], "a", "b")).toBe(false);
    expect(extendReady(["a"], "a", "b")).toBe(false);
    expect(extendReady(recordExtendTap(["a"], "b"), "a", "b")).toBe(true);
  });
});

describe("mystery pick", () => {
  it("never returns an excluded id", () => {
    expect(mysteryPick([{ id: "a" }, { id: "b" }], ["a", "b"])).toBeNull();
    const pick = mysteryPick([{ id: "a" }, { id: "b" }], ["a"]);
    expect(pick?.id).toBe("b");
  });
});
