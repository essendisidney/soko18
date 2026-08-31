import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  dropSearchNotify,
  joinSearchNotify,
  notifyLabel,
  onSearchNotify,
  searchNotifyKey,
  SEARCH_NOTIFY_KEY,
} from "@/lib/browse/search-notify";
import { parseIdList } from "@/lib/safety/local-ids";

const store = new Map<string, string>();

describe("Nairobi search notify", () => {
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

  it("stores a search without inventing matches", () => {
    expect(searchNotifyKey("  Westlands  ")).toBe("westlands");
    joinSearchNotify("Kilimani loft");
    expect(onSearchNotify("kilimani loft")).toBe(true);
    expect(onSearchNotify("cbd")).toBe(false);
    joinSearchNotify("area:south-b");
    expect(onSearchNotify("area:south-b")).toBe(true);
    expect(parseIdList(store.get(SEARCH_NOTIFY_KEY) ?? null)).toEqual(["area:south-b", "kilimani loft"]);
  });

  it("labels places and can drop a wait", () => {
    joinSearchNotify("area:south-b");
    expect(notifyLabel("area:south-b")).toBe("South B");
    expect(notifyLabel("category:featured")).toBe("Featured");
    expect(notifyLabel("kilimani loft")).toBe("kilimani loft");
    dropSearchNotify("area:south-b");
    expect(onSearchNotify("area:south-b")).toBe(false);
  });
});
