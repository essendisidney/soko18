import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { nairobiProfiles } from "@/lib/data/seed";
import { UUID } from "@/lib/likes/ids";
import { readLikeState } from "@/lib/likes/state";
import {
  formatRatingSummary,
  ownRating,
  summarizeRatings,
  upsertRating,
} from "@/lib/ratings/engine";
import { readRatingState, writeRatingState } from "@/lib/ratings/state";
import { takeRateLimit } from "@/lib/security/limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  profileId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  body: z.string().trim().max(280).optional(),
});

export async function submitRating(input: unknown) {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Pick 1 to 5." } };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to rate." } };
  }

  const limited = takeRateLimit("ratings", user.id);
  if (!limited.ok) {
    return { ok: false as const, status: limited.status, error: limited.error };
  }

  const seed = nairobiProfiles().find((p) => p.id === parsed.data.profileId || p.slug === parsed.data.profileId);
  const likes = await readLikeState(user.id);
  const local = await readRatingState(user.id);

  if (seed) {
    const next = upsertRating({
      actorId: user.id,
      targetProfileId: seed.id,
      score: parsed.data.score,
      body: parsed.data.body,
      matches: likes.matches,
      ratings: local.ratings,
    });
    if (!next.ok) {
      const status = next.code === "forbidden" ? 403 : 400;
      return {
        ok: false as const,
        status,
        error: {
          code: next.code,
          message: next.code === "forbidden" ? "Rate after a match." : "Pick 1 to 5.",
        },
      };
    }
    await writeRatingState({ actorId: user.id, ratings: next.ratings });
    const summary = summarizeRatings(next.ratings, seed.id);
    return {
      ok: true as const,
      data: { rating: next.rating, summary, line: formatRatingSummary(summary), persisted: false },
    };
  }

  if (!UUID.test(parsed.data.profileId) || !isSupabaseConfigured()) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Profile unavailable." } };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, account_id")
    .eq("id", parsed.data.profileId)
    .maybeSingle();
  if (!profile) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Profile unavailable." } };
  }
  if (profile.account_id === user.id) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "You cannot rate yourself." } };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .or(`and(account_a.eq.${user.id},account_b.eq.${profile.account_id}),and(account_a.eq.${profile.account_id},account_b.eq.${user.id})`)
    .maybeSingle();
  if (!match) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Rate after a match." } };
  }

  const { data, error } = await supabase
    .from("ratings")
    .upsert(
      {
        match_id: match.id,
        rater_id: user.id,
        target_account_id: profile.account_id,
        score: parsed.data.score,
        body: parsed.data.body?.trim() || null,
      },
      { onConflict: "match_id,rater_id" },
    )
    .select("id, match_id, rater_id, score, body, created_at")
    .maybeSingle();
  if (error || !data) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not rate." } };
  }

  return {
    ok: true as const,
    data: {
      rating: {
        id: data.id,
        matchId: data.match_id,
        raterId: data.rater_id,
        targetProfileId: parsed.data.profileId,
        score: data.score,
        body: data.body,
        createdAt: data.created_at,
      },
      persisted: true,
    },
  };
}

export async function loadRatings(profileKey: string) {
  const user = await currentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to see reviews." } };
  }

  const seed = nairobiProfiles().find((p) => p.id === profileKey || p.slug === profileKey);
  const likes = await readLikeState(user.id);
  const local = await readRatingState(user.id);

  if (seed) {
    const match = likes.matches.find(
      (row) => row.profileId === seed.id && (row.accountA === user.id || row.accountB === user.id),
    );
    if (!match) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Reviews after a match." } };
    }
    const summary = summarizeRatings(local.ratings, seed.id);
    return {
      ok: true as const,
      data: {
        summary,
        line: formatRatingSummary(summary),
        own: ownRating(local.ratings, user.id, seed.id),
        persisted: false,
      },
    };
  }

  return { ok: false as const, status: 404, error: { code: "not_found", message: "Profile unavailable." } };
}
