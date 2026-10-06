import { describe, expect, it } from "vitest";
import { snapPlace, areaBrowseHref, cityHomeHref, cityNameBySlug, cityOnboardingNext, cityOnboardingPrimary, citySlugFromPath, emptyBlockedLine, emptyMatchesLine, emptyNotifyLine, emptySavedLine, emptyStudioLine, kenyaDoorCities, placeShareName } from "@/lib/geo/kenya";
import { browseHomeFromCookie, categoryHrefFromCookie, cityFromRequest, parseCityCookie } from "@/lib/geo/city-cookie";

describe("kenya area snap", () => {
  it("snaps Kilimani without a live pin", () => {
    const place = snapPlace(-1.292, 36.788);
    expect(place.citySlug).toBe("nairobi");
    expect(place.areaSlug).toBe("kilimani");
  });

  it("snaps Kisumu from the city centre", () => {
    const place = snapPlace(-0.0917, 34.768);
    expect(place.citySlug).toBe("kisumu");
  });

  it("opens Browse in the snapped city", () => {
    expect(areaBrowseHref("nairobi", "kilimani")).toBe("/nairobi/kilimani");
    expect(areaBrowseHref("kisumu", "milimani")).toBe("/kisumu/milimani");
    expect(areaBrowseHref("mombasa")).toBe("/mombasa");
    expect(cityHomeHref("kisumu")).toBe("/kisumu");
    expect(cityHomeHref("nairobi")).toBe("/nairobi");
    expect(citySlugFromPath("/kisumu/milimani")).toBe("kisumu");
    expect(citySlugFromPath("/discover")).toBeNull();
    expect(citySlugFromPath("/browse")).toBeNull();
    expect(browseHomeFromCookie("kisumu")).toBe("/kisumu");
    expect(browseHomeFromCookie(null)).toBe("/nairobi");
    expect(browseHomeFromCookie("paris")).toBe("/nairobi");
    expect(categoryHrefFromCookie("kisumu")).toBe("/kisumu");
    expect(categoryHrefFromCookie("nairobi")).toBeNull();
    expect(categoryHrefFromCookie(null)).toBeNull();
    expect(placeShareName("kisumu", "milimani")).toBe("Milimani");
    expect(placeShareName("kisumu", "kilimani")).toBe("Kisumu");
    expect(cityNameBySlug("kisumu")).toBe("Kisumu");
    expect(parseCityCookie("kisumu")).toBe("kisumu");
    expect(parseCityCookie("nairobi")).toBe("nairobi");
    expect(parseCityCookie("paris")).toBe("nairobi");
    expect(parseCityCookie(null)).toBe("nairobi");
    expect(cityFromRequest(null, "soko18_city=kisumu")).toBe("kisumu");
    expect(cityFromRequest("mombasa", "soko18_city=kisumu")).toBe("mombasa");
    expect(cityFromRequest("paris", "soko18_city=kisumu")).toBe("kisumu");
    expect(cityFromRequest(null, null)).toBe("nairobi");
    expect(kenyaDoorCities("kisumu").map((city) => city.slug)).toContain("nairobi");
    expect(kenyaDoorCities("kisumu").map((city) => city.slug)).not.toContain("kisumu");
    expect(kenyaDoorCities("nairobi").map((city) => city.slug)).not.toContain("nairobi");
    expect(cityOnboardingPrimary(false, "kisumu")).toBe("Continue in Nairobi");
    expect(cityOnboardingPrimary(true, "kisumu")).toBe("Discover Kisumu");
    expect(cityOnboardingPrimary(true, "nairobi")).toBe("Discover Nairobi");
    expect(cityOnboardingNext(false, "kisumu")).toBe("/onboarding/intent");
    expect(cityOnboardingNext(false, "nairobi")).toBe("/onboarding/intent");
    expect(cityOnboardingNext(true, "kisumu")).toBe("/kisumu");
    expect(cityOnboardingNext(true, "nairobi")).toBe("/nairobi");
    expect(emptySavedLine("Kisumu")).toBe("Nothing saved in Kisumu yet.");
    expect(emptyNotifyLine("Kisumu")).toBe("Nothing waiting in Kisumu.");
    expect(emptyBlockedLine("Kisumu")).toBe("No one blocked in Kisumu.");
    expect(emptyMatchesLine()).toBe(
      "No matches yet. When someone you liked likes you back, they’ll show up here.",
    );
    expect(emptyStudioLine("Kisumu")).toBe("Create a profile in Kisumu. Add a photo and a few details and you’re live.");
  });
});

describe("network city guess", () => {
  it("maps a Mombasa network location to Mombasa and stays quiet outside Kenya", async () => {
    const { nearestCitySlug } = await import("@/lib/geo/kenya");
    expect(nearestCitySlug(-4.05, 39.67)).toBe("mombasa");
    expect(nearestCitySlug(-1.29, 36.82)).toBe("nairobi");
    expect(nearestCitySlug(-0.1, 34.75)).toBe("kisumu");
    expect(nearestCitySlug(51.5, -0.12)).toBeNull();
    expect(nearestCitySlug(Number.NaN, 1)).toBeNull();
  });
});
