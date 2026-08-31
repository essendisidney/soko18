import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dropWaitlist, joinWaitlist, onWaitlist, WAITLIST_KEY } from "@/lib/browse/waitlist";
import { notifyLabel } from "@/lib/browse/search-notify";

const store = new Map<string, string>();

describe("city waitlist notify", () => {
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
      value: {
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  });

  afterEach(() => {
    store.clear();
  });

  it("joins and drops a city without inventing a catalog", () => {
    joinWaitlist("kisumu");
    expect(onWaitlist("kisumu")).toBe(true);
    expect(JSON.parse(store.get(WAITLIST_KEY) ?? "[]")).toEqual(["kisumu"]);
    expect(notifyLabel("city:kisumu")).toBe("Kisumu");
    dropWaitlist("kisumu");
    expect(onWaitlist("kisumu")).toBe(false);
  });
});
