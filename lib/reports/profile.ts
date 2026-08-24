import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { nairobiProfiles } from "@/lib/data/seed";
import { UUID } from "@/lib/likes/ids";
import { REPORT_REASONS } from "@/lib/reports/reasons";
import { takeRateLimit } from "@/lib/security/limit";
import { readThreadState, writeThreadState } from "@/lib/messages/state";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const bodySchema = z.object({
  profileId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
});

export async function submitProfileReport(input: unknown) {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Choose a reason." } };
  }

  const user = await currentUser();
  if (!user) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to report." } };
  }

  const limited = takeRateLimit("reports", user.id);
  if (!limited.ok) {
    return { ok: false as const, status: limited.status, error: limited.error };
  }

  const { profileId, reason } = parsed.data;
  const seed = nairobiProfiles().find((p) => p.id === profileId || p.slug === profileId);
  if (seed) {
    const state = await readThreadState(user.id);
    await writeThreadState({
      ...state,
      reports: [
        ...state.reports,
        {
          id: crypto.randomUUID(),
          conversationId: `profile:${seed.id}`,
          reason,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    return { ok: true as const, data: { reported: true, persisted: false } };
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
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "You cannot report yourself." } };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "profile",
    target_id: profile.id,
    reason,
  });
  if (error) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not report." } };
  }

  return { ok: true as const, data: { reported: true, persisted: true } };
}
