import { describe, expect, it } from "vitest";
import { applyLike } from "@/lib/likes/engine";

describe("match creation", () => {
  it("does not match a self-like", () => {
    const result = applyLike({
      actorId: "a",
      targetProfileId: "p",
      targetAccountId: "a",
      kind: "like",
      likes: [],
      matches: [],
    });
    expect(result.matched).toBe(false);
    expect(result.likes).toEqual([]);
  });

  it("keeps a one-way like silent", () => {
    const result = applyLike({
      actorId: "seeker",
      actorProfileId: "seeker-profile",
      targetProfileId: "p2",
      targetAccountId: "owner-2",
      kind: "like",
      likes: [],
      matches: [],
      now: "2026-08-24T12:00:00.000Z",
    });
    expect(result.matched).toBe(false);
    expect(result.isNew).toBe(false);
    expect(result.likes).toEqual([{ actorId: "seeker", profileId: "p2", kind: "like" }]);
  });

  it("creates a match once when the like is mutual", () => {
    const first = applyLike({
      actorId: "owner",
      targetProfileId: "seeker-profile",
      targetAccountId: "seeker",
      kind: "like",
      likes: [],
      matches: [],
      now: "2026-08-24T12:00:00.000Z",
      ids: { matchId: "m1", conversationId: "c1" },
    });

    const mutual = applyLike({
      actorId: "seeker",
      actorProfileId: "seeker-profile",
      targetProfileId: "owner-profile",
      targetAccountId: "owner",
      kind: "like",
      likes: first.likes,
      matches: first.matches,
      now: "2026-08-24T12:00:00.000Z",
      ids: { matchId: "m1", conversationId: "c1" },
    });

    expect(mutual.matched).toBe(true);
    expect(mutual.isNew).toBe(true);
    expect(mutual.match?.id).toBe("m1");
    expect(mutual.match?.conversationId).toBe("c1");
    expect(mutual.matches).toHaveLength(1);

    const again = applyLike({
      actorId: "seeker",
      actorProfileId: "seeker-profile",
      targetProfileId: "owner-profile",
      targetAccountId: "owner",
      kind: "spotlight",
      likes: mutual.likes,
      matches: mutual.matches,
      inbound: true,
      ids: { matchId: "m2", conversationId: "c2" },
    });
    expect(again.isNew).toBe(false);
    expect(again.matches).toHaveLength(1);
  });

  it("matches a seed inbound like on first seeker like", () => {
    const result = applyLike({
      actorId: "seeker",
      targetProfileId: "p1",
      targetAccountId: "seed:p1",
      kind: "like",
      inbound: true,
      likes: [],
      matches: [],
      ids: { matchId: "m-amani", conversationId: "c-amani" },
    });
    expect(result.matched).toBe(true);
    expect(result.isNew).toBe(true);
  });
});
