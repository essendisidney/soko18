import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/profiles/route";
import { PATCH } from "@/app/api/profiles/id/[id]/route";

describe("cannot self-publish", () => {
  it("rejects POST status=live with 403", async () => {
    const res = await POST(
      new Request("http://soko18.test/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: "Amani",
          birthYear: 2000,
          areaSlug: "kilimani",
          status: "live",
        }),
      }),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
  });

  it("rejects PATCH status=live with 403", async () => {
    const res = await PATCH(
      new Request("http://soko18.test/api/profiles/id/00000000-0000-4000-8000-000000000001", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "live" }),
      }),
      { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }) },
    );
    expect(res.status).toBe(403);
  });
});
