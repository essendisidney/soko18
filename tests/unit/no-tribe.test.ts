import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INTENT_TAGS, INTENTS } from "@/lib/data/nairobi";
import { profileInputSchema } from "@/lib/profile/schema";

// Kutana never asks for, shows or filters by tribe or ethnicity (KUTANA_NEXT K2.4).
const BANNED = /\b(tribe|tribal|ethnic|ethnicity|clan|kabila)\b/i;

describe("no tribe or ethnicity", () => {
  it("is not a Looking for option or tag", () => {
    for (const option of [...INTENTS, ...INTENT_TAGS]) {
      expect(option.id).not.toMatch(BANNED);
      expect(option.label).not.toMatch(BANNED);
    }
  });

  it("is not a profile field", () => {
    for (const key of Object.keys(profileInputSchema.shape)) expect(key).not.toMatch(BANNED);
  });

  it("is not a database column or filter", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    for (const file of readdirSync(dir)) {
      const sql = readFileSync(join(dir, file), "utf8")
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n");
      expect(sql, file).not.toMatch(/(tribe|ethnic|kabila)\w*/i);
    }
  });
});
