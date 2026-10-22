import { describe, expect, it } from "vitest";
import { dbLimitError } from "@/lib/security/db-errors";

describe("dbLimitError", () => {
  it("maps the database limits to clear messages", () => {
    expect(dbLimitError('P0001: rate_limited')?.status).toBe(429);
    expect(dbLimitError("banned")?.error.code).toBe("suspended");
    expect(dbLimitError("new row violates row-level security policy")).toBeNull();
    expect(dbLimitError(null)).toBeNull();
  });
});
