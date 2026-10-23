import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Launch checklist: members only ever see "Kutana". Internal keys (soko18_*) are fine.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|html|json|webmanifest)$/.test(name) ? [path] : [];
  });
}

describe("brand", () => {
  it("never shows SOKO18 to members", () => {
    for (const file of [...files("app"), ...files("components"), ...files("lib/i18n"), "public/offline.html"]) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/SOKO18|Soko18|Soko 18/);
    }
  });
});
