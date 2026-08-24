import { z } from "zod";
import { UUID } from "@/lib/likes/ids";
import { rejectOwnerApprove } from "@/lib/media/guard";
import { requireStaff } from "@/lib/admin/staff";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  decision: z.enum(["approve", "reject", "request_replacement", "remove", "suspend", "ban"]),
  note: z.string().max(280).optional().default(""),
  status: z.string().optional(),
});

export async function decideModeration(targetId: string, input: unknown) {
  const staff = await requireStaff();
  if (!staff.ok) return staff;

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Unknown decision." } };
  }

  const blocked = rejectOwnerApprove(parsed.data.status);
  if (blocked) {
    return { ok: false as const, status: blocked.status, error: blocked.body.error };
  }

  if (!UUID.test(targetId)) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Case not found." } };
  }

  const supabase = await createClient();
  const { data: openCase } = await supabase
    .from("moderation_cases")
    .select("id")
    .eq("target_id", targetId)
    .in("status", ["open", "in_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let caseId = openCase?.id ?? null;
  if (!caseId) {
    const { data: created, error } = await supabase
      .from("moderation_cases")
      .insert({
        target_type: "media",
        target_id: targetId,
        status: "in_review",
        opened_by: staff.userId,
        assigned_to: staff.userId,
      })
      .select("id")
      .maybeSingle();
    if (error || !created) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not open a case." } };
    }
    caseId = created.id;
  }

  const { data: action, error: actionError } = await supabase
    .from("moderation_actions")
    .insert({
      case_id: caseId,
      actor_id: staff.userId,
      decision: parsed.data.decision,
      note: parsed.data.note || null,
    })
    .select("id")
    .maybeSingle();

  if (actionError || !action) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not record the decision." } };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: staff.userId,
    action: "moderation.decide",
    entity: "media",
    entity_id: targetId,
    metadata: {
      decision: parsed.data.decision,
      note: parsed.data.note,
      case_id: caseId,
      action_id: action.id,
    },
  });

  if (auditError) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Decision was not audited." } };
  }

  const mediaStatus =
    parsed.data.decision === "approve"
      ? "approved"
      : parsed.data.decision === "remove"
        ? "removed"
        : "rejected";

  await supabase
    .from("profile_media")
    .update({
      status: mediaStatus,
      reviewed_by: staff.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (["approve", "reject", "remove", "ban", "suspend"].includes(parsed.data.decision)) {
    await supabase.from("moderation_cases").update({ status: "resolved" }).eq("id", caseId);
  }

  return {
    ok: true as const,
    data: {
      id: targetId,
      decision: parsed.data.decision,
      note: parsed.data.note,
      caseId,
      actionId: action.id,
      audited: true as const,
    },
  };
}
