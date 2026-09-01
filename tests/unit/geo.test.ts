import { describe, expect, it } from "vitest";
import { snapPlace } from "@/lib/geo/kenya";

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
});
