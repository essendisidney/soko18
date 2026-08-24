import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { nairobiProfiles } from "@/lib/data/seed";
import { UUID } from "@/lib/likes/ids";
import { applyFlag } from "@/lib/safety/flags";
import { readIdListCookie, writeIdListCookie } from "@/lib/safety/id-cookie";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const FAVORITE_STATE_COOKIE = "soko18_favorite_state";

const bodySchema = z.object({
  profileId: z.string().min(1),
  saved: z.boolean(),
});

export async function submitFavorite(input: unknown) {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Missing favorite." } };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to save across devices." } };
  }

  const { profileId, saved } = parsed.data;
  const seed = nairobiProfiles().find((p) => p.id === profileId || p.slug === profileId);
  if (seed) {
    const state = await readIdListCookie(FAVORITE_STATE_COOKIE, user.id);
    await writeIdListCookie(FAVORITE_STATE_COOKIE, {
      actorId: user.id,
      ids: applyFlag(state.ids, seed.id, saved),
    });
    return { ok: true as const, data: { saved, persisted: false } };
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

  if (!profile || profile.status !== "live") {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Profile unavailable." } };
  }
  if (profile.account_id === user.id) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "You cannot save yourself." } };
  }

  if (saved) {
    const { error } = await supabase.from("favorites").upsert({
      account_id: user.id,
      profile_id: profile.id,
    });
    if (error) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not save." } };
    }
  } else {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("account_id", user.id)
      .eq("profile_id", profile.id);
    if (error) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not save." } };
    }
  }

  return { ok: true as const, data: { saved, persisted: true } };
}

export async function listFavorites() {
  const user = await currentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to save across devices." } };
  }

  const seed = await readIdListCookie(FAVORITE_STATE_COOKIE, user.id);
  if (!isSupabaseConfigured()) {
    return { ok: true as const, data: { ids: seed.ids, persisted: false } };
  }

  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("profile_id").eq("account_id", user.id);
  const live = (data ?? []).map((row) => row.profile_id as string);
  return { ok: true as const, data: { ids: [...new Set([...seed.ids, ...live])], persisted: live.length > 0 } };
}
