import { z } from "zod";
import { nairobiProfiles } from "@/lib/data/seed";
import { applyLike, orderedPair } from "@/lib/likes/engine";
import { SEED_INBOUND_IDS, seedAccountId, UUID } from "@/lib/likes/ids";
import { readLikeState, writeLikeState } from "@/lib/likes/state";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const bodySchema = z.object({
  profileId: z.string().min(1),
  kind: z.enum(["pass", "like", "spotlight"]),
});

export type LikeResult =
  | {
      ok: true;
      data: {
        matched: boolean;
        isNew: boolean;
        matchId?: string;
        conversationId?: string;
        persisted: boolean;
      };
    }
  | { ok: false; status: number; error: { code: string; message: string } };

async function currentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function submitLike(input: unknown): Promise<LikeResult> {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, error: { code: "invalid", message: "Missing like." } };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false, status: 401, error: { code: "unauthorized", message: "Sign in to like." } };
  }

  const { profileId, kind } = parsed.data;
  const seed = nairobiProfiles().find((p) => p.id === profileId || p.slug === profileId);

  if (seed) {
    const state = await readLikeState(user.id);
    const next = applyLike({
      actorId: user.id,
      targetProfileId: seed.id,
      targetAccountId: seedAccountId(seed.id),
      kind,
      inbound: SEED_INBOUND_IDS.has(seed.id),
      likes: state.likes,
      matches: state.matches,
    });
    await writeLikeState({ actorId: user.id, likes: next.likes, matches: next.matches });
    return {
      ok: true,
      data: {
        matched: next.matched,
        isNew: next.isNew,
        matchId: next.match?.id,
        conversationId: next.match?.conversationId,
        persisted: false,
      },
    };
  }

  if (!UUID.test(profileId) || !isSupabaseConfigured()) {
    return { ok: false, status: 404, error: { code: "not_found", message: "Profile unavailable." } };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, account_id, status")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile || profile.status !== "live") {
    return { ok: false, status: 404, error: { code: "not_found", message: "Profile unavailable." } };
  }
  if (profile.account_id === user.id) {
    return { ok: false, status: 403, error: { code: "forbidden", message: "You cannot like yourself." } };
  }

  const [accountA, accountB] = orderedPair(user.id, profile.account_id);

  const { data: existingMatch } = await supabase
    .from("matches")
    .select("id, conversations(id)")
    .eq("account_a", accountA)
    .eq("account_b", accountB)
    .maybeSingle();

  const { error } = await supabase.from("likes").upsert(
    { actor_id: user.id, profile_id: profile.id, kind },
    { onConflict: "actor_id,profile_id" },
  );

  if (error) {
    return { ok: false, status: 403, error: { code: "forbidden", message: "Could not save this like." } };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, conversations(id)")
    .eq("account_a", accountA)
    .eq("account_b", accountB)
    .maybeSingle();

  const conversation = Array.isArray(match?.conversations)
    ? match.conversations[0]
    : match?.conversations;
  const matched = Boolean(match?.id);

  return {
    ok: true,
    data: {
      matched,
      isNew: matched && !existingMatch?.id,
      matchId: match?.id,
      conversationId: conversation && "id" in conversation ? conversation.id : undefined,
      persisted: true,
    },
  };
}
