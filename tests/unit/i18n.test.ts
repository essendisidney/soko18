import { describe, expect, it } from "vitest";
import { LOCALES, MESSAGES, translate } from "@/lib/i18n/messages";
import { looksLikePaidService } from "@/lib/safety/paid-services";

describe("i18n", () => {
  it("has every English key, non-empty, in every locale", () => {
    const keys = Object.keys(MESSAGES.en);
    for (const { id } of LOCALES) {
      expect(Object.keys(MESSAGES[id]).sort(), id).toEqual([...keys].sort());
      for (const key of keys) expect(MESSAGES[id][key as keyof typeof MESSAGES.en].trim(), `${id}:${key}`).not.toBe("");
    }
  });

  it("keeps placeholders and prices in every locale", () => {
    for (const { id } of LOCALES) {
      expect(MESSAGES[id]["welcome.continueNairobi"], id).toContain("{city}");
      expect(MESSAGES[id]["discover.getGold"], id).toContain("KES 39");
    }
  });

  it("never says anything the paid-services filter would hold", () => {
    for (const { id } of LOCALES) for (const text of Object.values(MESSAGES[id])) expect(looksLikePaidService(text), `${id}: ${text}`).toBe(false);
  });

  it("translates", () => {
    expect(translate("sw", "tab.discover")).toBe("Gundua");
    expect(translate("fr", "tab.matches")).toBe("Matchs");
    expect(translate("sheng", "showMe.man")).toBe("Masee");
    expect(translate("am", "tab.me")).toBe("እኔ");
  });
});
