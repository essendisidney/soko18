import { cookies } from "next/headers";
import type { LikeRow, MatchRow } from "@/lib/likes/engine";

export const LIKE_STATE_COOKIE = "soko18_like_state";

export type LikeState = {
  actorId: string;
  likes: LikeRow[];
  matches: MatchRow[];
};

export async function readLikeState(actorId: string): Promise<LikeState> {
  const store = await cookies();
  const raw = store.get(LIKE_STATE_COOKIE)?.value;
  if (!raw) return { actorId, likes: [], matches: [] };
  try {
    const parsed = JSON.parse(raw) as LikeState;
    if (parsed.actorId !== actorId) return { actorId, likes: [], matches: [] };
    return {
      actorId,
      likes: parsed.likes ?? [],
      matches: parsed.matches ?? [],
    };
  } catch {
    return { actorId, likes: [], matches: [] };
  }
}

export async function writeLikeState(state: LikeState) {
  const store = await cookies();
  store.set(LIKE_STATE_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
