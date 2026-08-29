import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingEngage,
  PENDING_ENGAGE_KEY,
  readPendingEngage,
  writePendingEngage,
} from "@/lib/auth/pending-engage";

const store = new Map<string, string>();

describe("pending like after auth", () => {
  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
  });

  afterEach(() => {
    store.clear();
  });

  it("keeps a like until they sign in", () => {
    writePendingEngage({ profileId: "p1", kind: "like", at: Date.now() });
    expect(readPendingEngage()?.profileId).toBe("p1");
    expect(readPendingEngage()?.kind).toBe("like");
  });

  it("drops Not now and stale likes", () => {
    writePendingEngage({ profileId: "p1", kind: "spotlight", at: Date.now() });
    clearPendingEngage();
    expect(readPendingEngage()).toBeNull();
    writePendingEngage({ profileId: "p2", kind: "like", at: Date.now() - 31 * 60 * 1000 });
    expect(readPendingEngage()).toBeNull();
    expect(store.get(PENDING_ENGAGE_KEY)).toBeUndefined();
  });
});
