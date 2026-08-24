import type { ProfileDraft } from "@/lib/profile/types";
import { rejectPaidFlags } from "@/lib/payments/flags";
import { profileInputSchema, rejectSelfPublish } from "@/lib/profile/schema";
import { uniqueProfileSlug } from "@/lib/profile/slug";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type SaveProfileResult =
  | { ok: true; data: ProfileDraft; persisted: boolean }
  | { ok: false; error: { code: string; message: string }; status: number };

function toOwnerStatus(status: string): ProfileDraft["status"] {
  if (status === "paused") return "paused";
  if (status === "pending_review") return "pending_review";
  return "draft";
}

export async function saveProfile(input: unknown): Promise<SaveProfileResult> {
  const blocked = rejectSelfPublish(
    typeof input === "object" && input !== null && "status" in input
      ? String((input as { status?: unknown }).status)
      : undefined,
  );
  if (blocked) return { ok: false, error: blocked.body.error, status: blocked.status };
  const paid = rejectPaidFlags(input);
  if (paid) return { ok: false, error: paid.body.error, status: paid.status };

  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "invalid", message: "Check name, year, and area." },
      status: 400,
    };
  }

  const value = parsed.data;
  const draft: ProfileDraft = {
    id: value.id ?? crypto.randomUUID(),
    slug: uniqueProfileSlug(value.displayName),
    displayName: value.displayName,
    birthYear: value.birthYear,
    citySlug: "nairobi",
    areaSlug: value.areaSlug,
    bio: value.bio ?? "",
    availability: value.availability ?? "",
    indexPublic: value.indexPublic,
    status: value.status,
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    return { ok: true, data: draft, persisted: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: { code: "unauthorized", message: "Sign in to save a profile." }, status: 401 };
  }

  const { data: city } = await supabase
    .from("locations")
    .select("id")
    .eq("kind", "city")
    .eq("slug", "nairobi")
    .maybeSingle();
  const { data: area } = await supabase
    .from("locations")
    .select("id")
    .eq("kind", "area")
    .eq("slug", value.areaSlug)
    .maybeSingle();

  if (!city?.id) {
    return { ok: false, error: { code: "not_found", message: "Nairobi is not available yet." }, status: 404 };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, slug")
    .eq("account_id", user.id)
    .maybeSingle();

  const slug = existing?.slug ?? draft.slug;
  const row = {
    account_id: user.id,
    slug,
    display_name: draft.displayName,
    birth_year: draft.birthYear,
    city_id: city.id,
    area_id: area?.id ?? null,
    bio: draft.bio || null,
    status: draft.status,
  };

  const query = existing
    ? supabase
        .from("profiles")
        .update(row)
        .eq("id", existing.id)
        .eq("account_id", user.id)
        .select("id, slug, status")
        .maybeSingle()
    : supabase.from("profiles").insert(row).select("id, slug, status").maybeSingle();

  const { data, error } = await query;
  if (error || !data) {
    return {
      ok: false,
      error: { code: "forbidden", message: "Could not save this profile." },
      status: 403,
    };
  }

  return {
    ok: true,
    data: {
      ...draft,
      id: data.id,
      slug: data.slug,
      status: toOwnerStatus(data.status),
    },
    persisted: true,
  };
}
