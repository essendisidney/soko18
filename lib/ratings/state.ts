import { cookies } from "next/headers";
import type { RatingRow } from "@/lib/ratings/engine";

export const RATING_STATE_COOKIE = "soko18_rating_state";

export type RatingState = {
  actorId: string;
  ratings: RatingRow[];
};

export async function readRatingState(actorId: string): Promise<RatingState> {
  const store = await cookies();
  const raw = store.get(RATING_STATE_COOKIE)?.value;
  if (!raw) return { actorId, ratings: [] };
  try {
    const parsed = JSON.parse(raw) as RatingState;
    if (parsed.actorId !== actorId) return { actorId, ratings: [] };
    return { actorId, ratings: parsed.ratings ?? [] };
  } catch {
    return { actorId, ratings: [] };
  }
}

export async function writeRatingState(state: RatingState) {
  const store = await cookies();
  store.set(RATING_STATE_COOKIE, JSON.stringify({ ...state, ratings: state.ratings.slice(-80) }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
