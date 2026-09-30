import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readDiscoverPrefs } from "@/lib/discovery/prefs";
import { ONBOARDING } from "@/lib/onboarding";
import { defaultNearArea, nearAreaSnapshot, nearFromRequest, readNearArea, writeCity, writeNearArea } from "@/lib/nairobi/near";
import { checkIn } from "@/lib/presence/here";

const store = new Map<string, string>();

describe("near area city scope", () => {
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

  it("drops a stale Nairobi area when the city becomes Kisumu", () => {
    store.set(ONBOARDING.city, "nairobi");
    store.set(ONBOARDING.nearArea, "kilimani");
    writeCity("kisumu");
    expect(nearAreaSnapshot()).toBe("milimani");
    expect(readNearArea()).toBe("milimani");
    expect(defaultNearArea("kisumu")).toBe("milimani");
    writeNearArea("kilimani");
    expect(nearAreaSnapshot()).toBe("milimani");
  });

  it("does not send Kilimani to Discover in Kisumu", () => {
    store.set(ONBOARDING.city, "kisumu");
    store.set(ONBOARDING.nearArea, "kilimani");
    const prefs = readDiscoverPrefs();
    expect(prefs.city).toBe("kisumu");
    expect(prefs.near).toBe("milimani");
  });

  it("pings a Kisumu area, not leftover Kilimani", () => {
    store.set(ONBOARDING.city, "kisumu");
    const ping = checkIn("kilimani", "kisumu");
    expect(ping.areaSlug).toBe("milimani");
    expect(ping.citySlug).toBe("kisumu");
    expect(nearAreaSnapshot()).toBe("milimani");
  });

  it("ranks near a real area in the requested city", () => {
    expect(nearFromRequest("kisumu", "kilimani")).toBe("milimani");
    expect(nearFromRequest("kisumu", "kondele")).toBe("kondele");
    expect(nearFromRequest("nairobi", null)).toBe("kilimani");
  });
});
