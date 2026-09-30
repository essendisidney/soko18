import { describe, expect, it } from "vitest";
import { MESSAGES, translate } from "@/lib/i18n/messages";

describe("i18n", () => {
  it("has every English key in Swahili and French", () => {
    const keys = Object.keys(MESSAGES.en);
    for (const locale of ["sw", "fr"] as const) {
      for (const key of keys) expect(MESSAGES[locale][key as keyof typeof MESSAGES.en], `${locale}:${key}`).toBeTruthy();
    }
  });

  it("translates", () => {
    expect(translate("sw", "tab.discover")).toBe("Gundua");
    expect(translate("fr", "tab.matches")).toBe("Matchs");
  });
});
