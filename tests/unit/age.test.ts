import { describe, expect, it } from "vitest";
import { adultCutoff, ageGateMaxDate, isAdultBirthDate, parseDateInput } from "@/lib/age";

const now = new Date(2026, 8, 1);

describe("age gate", () => {
  it("allows the 18th birthday and rejects the day before", () => {
    expect(isAdultBirthDate("2008-09-01", now)).toBe(true);
    expect(isAdultBirthDate("2008-09-02", now)).toBe(false);
  });

  it("rejects empty, future, and impossible dates", () => {
    expect(isAdultBirthDate("", now)).toBe(false);
    expect(isAdultBirthDate("2027-01-01", now)).toBe(false);
    expect(isAdultBirthDate("2008-13-01", now)).toBe(false);
    expect(parseDateInput("2008-02-30")).toBeNull();
  });

  it("caps the date field on the 18th birthday", () => {
    expect(ageGateMaxDate(now)).toBe("2008-09-01");
    expect(adultCutoff(now)).toEqual(new Date(2008, 8, 1));
  });
});
