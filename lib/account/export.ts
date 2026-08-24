import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function exportOwnAccount() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to export your data." } };
  }

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, role, display_name, date_of_birth, intent, age_confirmed_at, last_seen_at, created_at, is_banned, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!account || account.deleted_at) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Account not found." } };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, slug, display_name, birth_year, bio, status, is_verified")
    .eq("account_id", user.id)
    .maybeSingle();

  const { data: media } = profile
    ? await supabase
        .from("profile_media")
        .select("id, storage_path, status, sort_order, is_cover")
        .eq("profile_id", profile.id)
    : { data: [] };

  const { data: likes } = await supabase
    .from("likes")
    .select("profile_id, kind, created_at")
    .eq("actor_id", user.id);

  return {
    ok: true as const,
    data: {
      exportedAt: new Date().toISOString(),
      account: {
        id: account.id,
        role: account.role,
        displayName: account.display_name,
        dateOfBirth: account.date_of_birth,
        intent: account.intent,
        ageConfirmedAt: account.age_confirmed_at,
        createdAt: account.created_at,
      },
      profile: profile
        ? {
            id: profile.id,
            slug: profile.slug,
            displayName: profile.display_name,
            birthYear: profile.birth_year,
            bio: profile.bio,
            status: profile.status,
            verified: profile.is_verified,
          }
        : null,
      media: (media ?? []).map((row) => ({
        id: row.id,
        path: row.storage_path,
        status: row.status,
        cover: row.is_cover,
      })),
      likes: likes ?? [],
    },
  };
}
