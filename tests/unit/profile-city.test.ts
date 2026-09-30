import { describe, expect, it } from "vitest";
import { areasForCity } from "@/lib/geo/kenya";
import { profileInputSchema } from "@/lib/profile/schema";
import { uniqueProfileSlug } from "@/lib/profile/slug";

describe("profile city", () => {
  it("accepts a Nairobi area without a city field", () => {
    const parsed = profileInputSchema.safeParse({
      displayName: "Amani",
      birthYear: 2000,
      areaSlug: "kilimani",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.citySlug).toBe("nairobi");
  });

  it("accepts a Kisumu draft and rejects a Nairobi area there", () => {
    expect(
      profileInputSchema.safeParse({
        displayName: "Amani",
        birthYear: 2000,
        citySlug: "kisumu",
        areaSlug: "milimani",
      }).success,
    ).toBe(true);
    expect(
      profileInputSchema.safeParse({
        displayName: "Amani",
        birthYear: 2000,
        citySlug: "kisumu",
        areaSlug: "kilimani",
      }).success,
    ).toBe(false);
  });

  it("lists real areas for the snapped city", () => {
    expect(areasForCity("nairobi").some((area) => area.slug === "kilimani")).toBe(true);
    expect(areasForCity("kisumu").some((area) => area.slug === "milimani")).toBe(true);
    expect(areasForCity("kisumu").some((area) => area.slug === "kilimani")).toBe(false);
  });

  it("stems a draft slug in the snapped city", () => {
    expect(uniqueProfileSlug("Amani")).toBe("amani-nairobi-2");
    expect(uniqueProfileSlug("Achieng", [], "kisumu")).toBe("achieng-kisumu");
    expect(uniqueProfileSlug("Achieng", [], "paris")).toBe("achieng-nairobi");
    expect(uniqueProfileSlug("Amani", ["amani-kisumu"], "kisumu")).toBe("amani-kisumu-2");
  });
});
