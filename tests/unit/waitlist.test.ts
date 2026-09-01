import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dropWaitlist, joinWaitlist, onWaitlist, WAITLIST_KEY } from "@/lib/browse/waitlist";
import { notifyLabel } from "@/lib/browse/search-notify";
import { WAITLIST_CITIES } from "@/lib/data/nairobi";
import { waitlistAreas, waitlistCity } from "@/lib/data/waitlist";

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

  it("covers Kenya city doors with real areas", () => {
    expect(WAITLIST_CITIES.map((city) => city.slug)).toEqual(
      expect.arrayContaining(["mombasa", "kisumu", "thika", "kakamega", "garissa", "homa-bay"]),
    );
    expect(waitlistCity("nairobi")).toBeNull();
    expect(waitlistAreas("thika").map((area) => area.slug)).toContain("makongeni");
    expect(waitlistAreas("nowhere")).toEqual([]);
    for (const city of WAITLIST_CITIES) {
      expect(waitlistAreas(city.slug).length).toBeGreaterThan(0);
    }
  });
});
