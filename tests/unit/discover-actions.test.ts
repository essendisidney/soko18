import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  lastPass,
  undoLastPass,
  writeDiscoverAction,
} from "@/lib/discovery/actions";

const store = new Map<string, string>();

describe("discover pass undo", () => {
  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "localStorage", {
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

  it("restores only the latest pass", () => {
    const now = Date.now();
    writeDiscoverAction({ profileId: "p1", kind: "pass", at: now - 2 });
    writeDiscoverAction({ profileId: "p2", kind: "like", at: now - 1 });
    writeDiscoverAction({ profileId: "p3", kind: "pass", at: now });
    expect(lastPass()?.profileId).toBe("p3");
    expect(undoLastPass()).toBe("p3");
    expect(lastPass()?.profileId).toBe("p1");
    expect(undoLastPass()).toBe("p1");
    expect(undoLastPass()).toBeNull();
  });
});
