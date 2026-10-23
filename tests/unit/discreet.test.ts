import { describe, expect, it } from "vitest";
import { checkPin, hashPin, RELOCK_MS, shouldLock, validPin } from "@/lib/discreet/settings";

describe("discreet mode", () => {
  it("takes a 4 to 6 digit PIN", () => {
    expect(validPin("1234")).toBe(true);
    expect(validPin("123456")).toBe(true);
    expect(validPin("123")).toBe(false);
    expect(validPin("12a4")).toBe(false);
  });

  it("stores only a salted hash and checks against it", async () => {
    const hash = await hashPin("2468", "salt");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("2468");
    expect(await hashPin("2468", "other")).not.toBe(hash);
    expect(await checkPin("2468", { pinHash: hash, salt: "salt" })).toBe(true);
    expect(await checkPin("1357", { pinHash: hash, salt: "salt" })).toBe(false);
  });

  it("locks on open and after a minute away, only when a PIN is set", () => {
    const now = 1_000_000;
    expect(shouldLock({}, null, now)).toBe(false);
    expect(shouldLock({ pinHash: "x" }, null, now)).toBe(true);
    expect(shouldLock({ pinHash: "x" }, now - 10_000, now)).toBe(false);
    expect(shouldLock({ pinHash: "x" }, now - RELOCK_MS - 1, now)).toBe(true);
  });
});
