import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isFreshMatch, markMatchSeen, MATCH_WAITING_KEY, writeMatchWaiting } from "@/lib/matches/waiting";
import { parseIdList } from "@/lib/safety/local-ids";

const store = new Map<string, string>();

describe("new match waiting", () => {
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

  it("is fresh until they open or say hello", () => {
    expect(isFreshMatch(null, false)).toBe(true);
    expect(isFreshMatch("Say hello", false)).toBe(false);
    expect(isFreshMatch("Westlands?", false)).toBe(false);
    expect(isFreshMatch(null, true)).toBe(false);
  });

  it("clears the waiting mark when the thread is opened", () => {
    writeMatchWaiting("p1", true);
    expect(parseIdList(store.get(MATCH_WAITING_KEY) ?? null)).toEqual(["p1"]);
    markMatchSeen("p1");
    expect(parseIdList(store.get(MATCH_WAITING_KEY) ?? null)).toEqual([]);
  });
});
