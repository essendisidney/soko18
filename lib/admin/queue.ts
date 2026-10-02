import { z } from "zod";
import { requireStaff } from "@/lib/admin/staff";
import { createClient } from "@/lib/supabase/server";

export type QueueItem =
  | { kind: "media"; id: string; url: string | null; profileName: string; profileId: string; at: string; live: boolean }
  | {
      kind: "profile";
      id: string;
      name: string;
      bio: string;
      lookingFor: string | null;
      url: string | null;
      at: string;
      /** Already showing (live first, checked after) vs held for a person to look. */
      live: boolean;
    }
  | { kind: "selfie"; id: string; name: string; challenge: string; selfieUrl: string | null; photoUrl: string | null; at: string }
  | { kind: "case"; id: string; targetType: string; targetId: string; reason: string; text: string; at: string };

async function sign(bucket: string, paths: string[]) {
  if (paths.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 900);
  return new Map((data ?? []).filter((row) => row.path).map((row) => [row.path as string, row.signedUrl]));
}

/** Everything waiting on a human, oldest first. Staff-only (RLS + requireStaff). */
export async function loadQueue() {
  const staff = await requireStaff();
  if (!staff.ok) return staff;
  const supabase = await createClient();

  const [media, profiles, selfies, cases] = await Promise.all([
    supabase
      .from("profile_media")
      .select("id, storage_path, status, created_at, profile_id, profiles(display_name)")
      .or("status.in.(uploaded,scanning,pending_review),and(status.eq.approved,reviewed_at.is.null)")
      .order("created_at")
      .limit(50),
    supabase
      .from("profiles")
      .select("id, display_name, bio, looking_for, status, created_at, profile_media(storage_path, status, is_cover)")
      .or("status.eq.pending_review,and(status.eq.live,checked_at.is.null)")
      .order("updated_at")
      .limit(50),
    supabase
      .from("verification_records")
      .select("id, evidence_path, challenge, created_at, profile_id, profiles(display_name, profile_media(storage_path, status, is_cover))")
      .eq("kind", "profile")
      .eq("status", "pending")
      .not("evidence_path", "is", null)
      .order("created_at")
      .limit(50),
    supabase
      .from("moderation_cases")
      .select("id, target_type, target_id, created_at")
      .in("status", ["open", "in_review"])
      .in("target_type", ["profile", "message", "account"])
      .order("created_at")
      .limit(50),
  ]);

  type MediaRow = { storage_path: string; status: string; is_cover: boolean };
  const one = <T,>(value: T | T[] | null | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
  const coverOf = (rows: MediaRow[] | null | undefined) =>
    (rows ?? []).find((m) => m.is_cover && m.status === "approved")?.storage_path ??
    (rows ?? []).find((m) => m.status !== "rejected" && m.status !== "removed")?.storage_path ??
    null;

  const mediaPaths = [
    ...(media.data ?? []).map((m) => m.storage_path as string),
    ...(profiles.data ?? []).map((p) => coverOf(p.profile_media as MediaRow[])).filter((x): x is string => Boolean(x)),
    ...(selfies.data ?? [])
      .map((s) => coverOf(one(s.profiles as unknown as { profile_media: MediaRow[] } | null)?.profile_media))
      .filter((x): x is string => Boolean(x)),
  ];
  const [mediaUrls, selfieUrls] = await Promise.all([
    sign("profile-media", mediaPaths),
    sign("verification", (selfies.data ?? []).map((s) => s.evidence_path as string)),
  ]);

  // Case details: the flagged text staff need to judge.
  const caseRows = cases.data ?? [];
  const profileIds = caseRows.filter((c) => c.target_type === "profile").map((c) => c.target_id as string);
  const messageIds = caseRows.filter((c) => c.target_type === "message").map((c) => c.target_id as string);
  const [caseProfiles, caseMessages, caseReports] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, display_name, bio").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string; bio: string | null }[] }),
    messageIds.length
      ? supabase.from("messages").select("id, body").in("id", messageIds)
      : Promise.resolve({ data: [] as { id: string; body: string | null }[] }),
    caseRows.length
      ? supabase.from("reports").select("target_id, reason").in("target_id", caseRows.map((c) => c.target_id as string))
      : Promise.resolve({ data: [] as { target_id: string; reason: string }[] }),
  ]);
  const profileText = new Map((caseProfiles.data ?? []).map((p) => [p.id, `${p.display_name}: ${p.bio ?? ""}`]));
  const messageText = new Map((caseMessages.data ?? []).map((m) => [m.id, m.body ?? ""]));
  const reasons = new Map((caseReports.data ?? []).map((r) => [r.target_id, r.reason]));

  const items: QueueItem[] = [
    ...caseRows.map((c) => ({
      kind: "case" as const,
      id: c.id as string,
      targetType: c.target_type as string,
      targetId: c.target_id as string,
      reason: reasons.get(c.target_id as string) ?? "auto: paid services filter",
      text:
        c.target_type === "profile"
          ? profileText.get(c.target_id as string) ?? ""
          : c.target_type === "message"
            ? messageText.get(c.target_id as string) ?? ""
            : "",
      at: c.created_at as string,
    })),
    ...(selfies.data ?? []).map((s) => {
      const p = one(s.profiles as unknown as { display_name: string; profile_media: MediaRow[] } | null);
      const cover = coverOf(p?.profile_media);
      return {
        kind: "selfie" as const,
        id: s.id as string,
        name: p?.display_name ?? "Member",
        challenge: (s.challenge as string) ?? "",
        selfieUrl: selfieUrls.get(s.evidence_path as string) ?? null,
        photoUrl: cover ? mediaUrls.get(cover) ?? null : null,
        at: s.created_at as string,
      };
    }),
    ...(media.data ?? []).map((m) => ({
      kind: "media" as const,
      id: m.id as string,
      url: mediaUrls.get(m.storage_path as string) ?? null,
      profileName: one(m.profiles as unknown as { display_name: string } | null)?.display_name ?? "Member",
      profileId: m.profile_id as string,
      at: m.created_at as string,
      live: m.status === "approved",
    })),
    ...(profiles.data ?? []).map((p) => {
      const cover = coverOf(p.profile_media as MediaRow[]);
      return {
        kind: "profile" as const,
        id: p.id as string,
        name: p.display_name as string,
        bio: (p.bio as string | null) ?? "",
        lookingFor: (p.looking_for as string | null) ?? null,
        url: cover ? mediaUrls.get(cover) ?? null : null,
        at: p.created_at as string,
        live: p.status === "live",
      };
    }),
  ];

  return { ok: true as const, data: { items } };
}

const decideSchema = z.object({
  kind: z.enum(["media", "profile", "selfie", "case"]),
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "release", "remove", "ban"]),
  note: z.string().max(200).optional(),
});

export async function decideQueueItem(input: unknown) {
  const staff = await requireStaff();
  if (!staff.ok) return staff;
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Unknown decision." } };
  }
  const { kind, id, action, note } = parsed.data;
  const supabase = await createClient();
  const approve = action === "approve";
  const call =
    kind === "media"
      ? supabase.rpc("staff_review_media", { p_media: id, p_approve: approve, p_note: note ?? null })
      : kind === "profile"
        ? supabase.rpc("staff_review_profile", { p_profile: id, p_approve: approve, p_note: note ?? null })
        : kind === "selfie"
          ? supabase.rpc("staff_review_verification", { p_record: id, p_approve: approve, p_note: note ?? null })
          : supabase.rpc("staff_resolve_case", { p_case: id, p_action: action, p_note: note ?? null });
  const { data, error } = await call;
  if (error) {
    const message = error.message.includes("needs_approved_photo")
      ? "Approve a photo for this profile first."
      : "Decision failed.";
    return { ok: false as const, status: 400, error: { code: "failed", message } };
  }
  return { ok: true as const, data };
}
