import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/likes/route";
import { applyLike } from "@/lib/likes/engine";

describe("POST /api/likes", () => {
  it("returns 401 without a session", async () => {
    const res = await POST(
      new Request("http://soko18.test/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: "p1", kind: "like" }),
      }),
    );
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("creates a match when the like is mutual — the path a sessioned POST uses", () => {
    const result = applyLike({
      actorId: "seeker",
      actorProfileId: "seeker-profile",
      targetProfileId: "p1",
      targetAccountId: "seed:p1",
      kind: "like",
      inbound: true,
      likes: [],
      matches: [],
      ids: { matchId: "match-1", conversationId: "convo-1" },
    });
    expect(result.matched).toBe(true);
    expect(result.isNew).toBe(true);
    expect(result.match?.id).toBe("match-1");
  });
});
