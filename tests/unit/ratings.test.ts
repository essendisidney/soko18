import { describe, expect, it } from "vitest";
import { applyLike } from "@/lib/likes/engine";
import {
  formatRatingSummary,
  matchForRating,
  summarizeRatings,
  upsertRating,
} from "@/lib/ratings/engine";

function mutualMatch() {
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
  return applyLike({
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
}

describe("two-way ratings", () => {
  it("forbids a rating without a match", () => {
    const result = upsertRating({
      actorId: "seeker",
      targetProfileId: "owner-profile",
      score: 5,
      matches: [],
      ratings: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("forbidden");
  });

  it("accepts 1–5 after a match and replaces the same rater", () => {
    const matched = mutualMatch();
    const target = matched.match?.profileId ?? "seeker-profile";
    expect(matchForRating("owner", target, matched.matches)?.id).toBe("m1");
    const first = upsertRating({
      actorId: "owner",
      targetProfileId: target,
      score: 4,
      matches: matched.matches,
      ratings: [],
      now: "2026-08-24T12:00:00.000Z",
      id: "r1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = upsertRating({
      actorId: "owner",
      targetProfileId: target,
      score: 5,
      matches: matched.matches,
      ratings: first.ratings,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.ratings).toHaveLength(1);
    expect(again.rating.score).toBe(5);
    expect(summarizeRatings(again.ratings, target)).toEqual({ average: 5, count: 1 });
    expect(formatRatingSummary({ average: null, count: 0 })).toBe("No reviews yet.");
  });

  it("rejects a score outside 1–5", () => {
    const matched = mutualMatch();
    const result = upsertRating({
      actorId: "owner",
      targetProfileId: matched.match?.profileId ?? "seeker-profile",
      score: 6,
      matches: matched.matches,
      ratings: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid");
  });
});
