import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { nairobiProfiles } from "@/lib/data/seed";
import { seedAccountId, UUID } from "@/lib/likes/ids";
import { applyFlag } from "@/lib/safety/flags";
import { readIdListCookie, writeIdListCookie } from "@/lib/safety/id-cookie";
import { readThreadState, writeThreadState } from "@/lib/messages/state";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const BLOCK_STATE_COOKIE = "soko18_block_state";

const bodySchema = z.object({
  profileId: z.string().min(1),
  blocked: z.boolean(),
});

export async function submitBlock(input: unknown) {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Missing block." } };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to block across devices." } };
  }

  const { profileId, blocked } = parsed.data;
  const seed = nairobiProfiles().find((p) => p.id === profileId || p.slug === profileId);
  if (seed) {
    const state = await readIdListCookie(BLOCK_STATE_COOKIE, user.id);
    await writeIdListCookie(BLOCK_STATE_COOKIE, {
      actorId: user.id,
      ids: applyFlag(state.ids, seed.id, blocked),
    });

    const other = seedAccountId(seed.id);
    const threads = await readThreadState(user.id);
    const blocks = blocked
      ? threads.blocks.some((row) => row.blockerId === user.id && row.blockedId === other)
        ? threads.blocks
        : [...threads.blocks, { blockerId: user.id, blockedId: other }]
      : threads.blocks.filter((row) => !(row.blockerId === user.id && row.blockedId === other));
    await writeThreadState({ ...threads, blocks });

    return { ok: true as const, data: { blocked, persisted: false } };
  }

  if (!UUID.test(profileId) || !isSupabaseConfigured()) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Profile unavailable." } };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, account_id, status")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Profile unavailable." } };
  }
  if (profile.account_id === user.id) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "You cannot block yourself." } };
  }

  if (blocked) {
    const { error } = await supabase.from("blocks").upsert({
      blocker_id: user.id,
      blocked_id: profile.account_id,
    });
    if (error) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not block." } };
    }
  } else {
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", profile.account_id);
    if (error) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not unblock." } };
    }
  }

  return { ok: true as const, data: { blocked, persisted: true } };
}
