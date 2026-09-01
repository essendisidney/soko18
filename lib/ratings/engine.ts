import type { MatchRow } from "@/lib/likes/engine";

export type RatingRow = {
  id: string;
  matchId: string;
  raterId: string;
  targetProfileId: string;
  score: number;
  body: string | null;
  createdAt: string;
};

export type RatingSummary = {
  average: number | null;
  count: number;
};

export function matchForRating(actorId: string, targetProfileId: string, matches: MatchRow[]) {
  return (
    matches.find(
      (row) =>
        row.profileId === targetProfileId && (row.accountA === actorId || row.accountB === actorId),
    ) ?? null
  );
}

export function validScore(score: number) {
  return Number.isInteger(score) && score >= 1 && score <= 5;
}

export function upsertRating(input: {
  actorId: string;
  targetProfileId: string;
  score: number;
  body?: string | null;
  matches: MatchRow[];
  ratings: RatingRow[];
  now?: string;
  id?: string;
}):
  | { ok: true; rating: RatingRow; ratings: RatingRow[] }
  | { ok: false; code: "forbidden" | "invalid" } {
  if (!validScore(input.score)) return { ok: false, code: "invalid" };
  const match = matchForRating(input.actorId, input.targetProfileId, input.matches);
  if (!match) return { ok: false, code: "forbidden" };
  if (input.actorId === `seed:${input.targetProfileId}`) return { ok: false, code: "forbidden" };

  const body = input.body?.trim() ? input.body.trim().slice(0, 280) : null;
  const existing = input.ratings.find(
    (row) => row.raterId === input.actorId && row.targetProfileId === input.targetProfileId,
  );
  const rating: RatingRow = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    matchId: match.id,
    raterId: input.actorId,
    targetProfileId: input.targetProfileId,
    score: input.score,
    body,
    createdAt: existing?.createdAt ?? input.now ?? new Date().toISOString(),
  };
  const ratings = existing
    ? input.ratings.map((row) => (row.id === existing.id ? rating : row))
    : [...input.ratings, rating];
  return { ok: true, rating, ratings };
}

export function summarizeRatings(ratings: RatingRow[], targetProfileId: string): RatingSummary {
  const rows = ratings.filter((row) => row.targetProfileId === targetProfileId);
  if (rows.length === 0) return { average: null, count: 0 };
  const total = rows.reduce((sum, row) => sum + row.score, 0);
  return { average: Math.round((total / rows.length) * 10) / 10, count: rows.length };
}

export function ownRating(ratings: RatingRow[], actorId: string, targetProfileId: string) {
  return ratings.find((row) => row.raterId === actorId && row.targetProfileId === targetProfileId) ?? null;
}

export function formatRatingSummary(summary: RatingSummary) {
  if (summary.count === 0) return "No reviews yet.";
  return `${summary.average} · ${summary.count} review${summary.count === 1 ? "" : "s"}`;
}
