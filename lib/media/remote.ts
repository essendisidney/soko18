import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const completeSchema = z.object({
  path: z.string().min(3).max(200),
});

/** Register a photo the member already uploaded to their own storage folder. Staff review decides. */
export async function registerUploadedPhoto(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to upload." } };
  }
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`${user.id}/`)) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Upload not found." } };
  }
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("account_id", user.id).maybeSingle();
  if (!profile) {
    return { ok: false as const, status: 404, error: { code: "no_profile", message: "Save your profile first." } };
  }
  const { count } = await supabase
    .from("profile_media")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .not("status", "in", "(rejected,removed,replaced)");
  if ((count ?? 0) >= 6) {
    return { ok: false as const, status: 400, error: { code: "limit", message: "Six photos is the limit." } };
  }
  const { data, error } = await supabase
    .from("profile_media")
    .insert({ profile_id: profile.id, storage_path: parsed.data.path, sort_order: count ?? 0 })
    .select("id, status")
    .maybeSingle();
  if (error || !data) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not save photo." } };
  }
  return { ok: true as const, data: { mediaId: data.id as string, status: data.status as string } };
}

/** The member's own photos with short-lived links, any status. */
export async function listMyPhotos() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in." } };
  }
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("account_id", user.id).maybeSingle();
  if (!profile) return { ok: true as const, data: { items: [] } };
  const { data: rows } = await supabase
    .from("profile_media")
    .select("id, storage_path, status, is_cover, sort_order, rejection_reason")
    .eq("profile_id", profile.id)
    .not("status", "in", "(removed,replaced)")
    .order("sort_order");
  const paths = (rows ?? []).map((row) => row.storage_path as string);
  const { data: signed } = paths.length
    ? await supabase.storage.from("profile-media").createSignedUrls(paths, 600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urls = new Map((signed ?? []).map((row) => [row.path, row.signedUrl]));
  return {
    ok: true as const,
    data: {
      items: (rows ?? []).map((row) => ({
        id: row.id as string,
        url: urls.get(row.storage_path as string) ?? null,
        status: row.status as string,
        isCover: Boolean(row.is_cover),
        reason: (row.rejection_reason as string | null) ?? null,
      })),
    },
  };
}

const MediaId = z.string().uuid();

async function ownPhoto(id: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in." } };
  }
  const parsed = MediaId.safeParse(id);
  if (!parsed.success) return { ok: false as const, status: 400, error: { code: "invalid", message: "Unknown photo." } };
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("account_id", user.id).maybeSingle();
  if (!profile) return { ok: false as const, status: 404, error: { code: "not_found", message: "Photo not found." } };
  const { data: photo } = await supabase
    .from("profile_media")
    .select("id, storage_path, is_cover")
    .eq("id", parsed.data)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!photo) return { ok: false as const, status: 404, error: { code: "not_found", message: "Photo not found." } };
  return { ok: true as const, supabase, profileId: profile.id as string, photo };
}

/** Remove one of your own photos (row and file). If it was the main photo, the next one becomes main. */
export async function removeMyPhoto(id: unknown) {
  const found = await ownPhoto(id);
  if (!found.ok) return found;
  const { supabase, profileId, photo } = found;
  const { error } = await supabase.from("profile_media").delete().eq("id", photo.id);
  if (error) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Couldn’t remove that photo." } };
  await supabase.storage.from("profile-media").remove([photo.storage_path as string]);
  const { data: rest } = await supabase
    .from("profile_media")
    .select("id")
    .eq("profile_id", profileId)
    .not("status", "in", "(removed,replaced)")
    .order("sort_order");
  // Keep the order tidy and make sure exactly one photo is main.
  for (const [index, row] of (rest ?? []).entries()) {
    await supabase
      .from("profile_media")
      .update({ sort_order: index, ...(photo.is_cover ? { is_cover: index === 0 } : {}) })
      .eq("id", row.id);
  }
  return { ok: true as const, data: { removed: photo.id } };
}

/** Make one of your own photos the main one (shown first on your card). */
export async function makeMainPhoto(id: unknown) {
  const found = await ownPhoto(id);
  if (!found.ok) return found;
  const { supabase, profileId, photo } = found;
  const { data: rows } = await supabase
    .from("profile_media")
    .select("id")
    .eq("profile_id", profileId)
    .not("status", "in", "(removed,replaced)")
    .order("sort_order");
  const ordered = [photo.id, ...(rows ?? []).map((r) => r.id).filter((rid) => rid !== photo.id)];
  for (const [index, rid] of ordered.entries()) {
    const { error } = await supabase
      .from("profile_media")
      .update({ sort_order: index, is_cover: index === 0 })
      .eq("id", rid);
    if (error) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Couldn’t update your photos." } };
  }
  return { ok: true as const, data: { main: photo.id } };
}
