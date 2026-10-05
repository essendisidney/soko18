import { describe, expect, it } from "vitest";
import { CAMPUS_SLUG, campusProgress, campusReason } from "@/lib/campus/shared";

describe("campus copy and progress", () => {
  it("explains every reason the database can return", () => {
    for (const code of ["unauthorized", "adult_only", "already", "not_campus", "taken", "wait", "limit", "expired", "wrong", "locked", "email_unavailable"]) {
      expect(campusReason(code)).not.toBe(campusReason("invalid"));
    }
    expect(campusReason("something_new")).toBe(campusReason("invalid"));
  });

  it("keeps the 18+ rule in the copy", () => {
    expect(campusReason("adult_only")).toMatch(/18/);
  });

  it("shows real progress, never past 100% and never an invisible bar", () => {
    expect(campusProgress(0, 300)).toBe(3);
    expect(campusProgress(150, 300)).toBe(50);
    expect(campusProgress(400, 300)).toBe(100);
    expect(campusProgress(5, 0)).toBe(100);
  });

  it("accepts only plain campus slugs", () => {
    expect(CAMPUS_SLUG.test("uon")).toBe(true);
    expect(CAMPUS_SLUG.test("dekut")).toBe(true);
    expect(CAMPUS_SLUG.test("UoN")).toBe(false);
    expect(CAMPUS_SLUG.test("uon,ku")).toBe(false);
  });
});
