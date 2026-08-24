import { describe, expect, it } from "vitest";
import { POST as postFavorite } from "@/app/api/favorites/route";
import { POST as postBlock } from "@/app/api/blocks/route";
import { POST as postReport } from "@/app/api/reports/route";

describe("profile safety APIs", () => {
  it("favorite requires a session to persist", async () => {
    const res = await postFavorite(
      new Request("http://soko18.test/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "p1", saved: true }),
      }),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("block requires a session to persist", async () => {
    const res = await postBlock(
      new Request("http://soko18.test/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "p1", blocked: true }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("profile report requires a session", async () => {
    const res = await postReport(
      new Request("http://soko18.test/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "p1", reason: "spam" }),
      }),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });
});
