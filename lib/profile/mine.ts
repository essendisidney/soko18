import type { ProfileDraft } from "@/lib/profile/types";
import { toProfileStatus } from "@/lib/profile/save";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type MyProfile = {
  profile: ProfileDraft | null;
  photos: number;
  /** Short-lived link to the main photo, for showing the member their own face. */
  coverUrl: string | null;
  /** Why it's held back, when a person needs to look (e.g. "needs_changes"). */
  heldReason: string | null;
};

/** The signed-in member's own profile, as the server sees it. The app's local copy follows this. */
export async function loadMyProfile() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in." } };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in." } };

  const { data: row } = await supabase
    .from("profiles")
    .select(
      "id, slug, display_name, birth_year, bio, gender, looking_for, prompts, status, flagged_reason, updated_at, city:locations!profiles_city_id_fkey(slug), area:locations!profiles_area_id_fkey(slug)",
    )
    .eq("account_id", user.id)
    .maybeSingle();

  if (!row) return { ok: true as const, data: { profile: null, photos: 0, coverUrl: null, heldReason: null } satisfies MyProfile };

  const { data: media } = await supabase
    .from("profile_media")
    .select("storage_path, is_cover, sort_order")
    .eq("profile_id", row.id)
    .not("status", "in", "(rejected,removed,replaced)")
    .order("sort_order");
  const count = media?.length ?? 0;
  const coverPath = (media ?? []).find((m) => m.is_cover)?.storage_path ?? media?.[0]?.storage_path ?? null;
  const { data: signed } = coverPath
    ? await supabase.storage.from("profile-media").createSignedUrl(coverPath as string, 3600)
    : { data: null };

  const one = <T,>(value: T | T[] | null) => (Array.isArray(value) ? value[0] : value) ?? null;
  const city = one(row.city as { slug: string } | { slug: string }[] | null);
  const area = one(row.area as { slug: string } | { slug: string }[] | null);

  const profile: ProfileDraft = {
    id: row.id as string,
    slug: row.slug as string,
    displayName: (row.display_name as string) ?? "",
    birthYear: (row.birth_year as number | null) ?? null,
    citySlug: city?.slug ?? "nairobi",
    areaSlug: area?.slug ?? "",
    bio: (row.bio as string | null) ?? "",
    gender: (row.gender as ProfileDraft["gender"]) ?? null,
    lookingFor: (row.looking_for as ProfileDraft["lookingFor"]) ?? null,
    prompts: Array.isArray(row.prompts) ? (row.prompts as { q: string; a: string }[]) : [],
    indexPublic: false,
    status: toProfileStatus(row.status as string),
    updatedAt: row.updated_at as string,
  };
  return {
    ok: true as const,
    data: { profile, photos: count, coverUrl: signed?.signedUrl ?? null, heldReason: (row.flagged_reason as string | null) ?? null } satisfies MyProfile,
  };
}
