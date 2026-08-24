import { z } from "zod";
import { resolveThread } from "@/lib/messages/access";
import { readThreadState, writeThreadState } from "@/lib/messages/state";
import { createClient } from "@/lib/supabase/server";
import { UUID } from "@/lib/likes/ids";

const bodySchema = z.object({
  conversationId: z.string().min(1),
  reason: z.enum(["spam", "harassment", "fake", "underage", "unsafe", "other"]),
});

export async function submitReport(input: unknown) {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Choose a reason." } };
  }

  const resolved = await resolveThread(parsed.data.conversationId);
  if (!resolved.ok) return resolved;
  const { access } = resolved;

  if (access.persisted && UUID.test(access.item.otherAccountId)) {
    const supabase = await createClient();
    const { error } = await supabase.from("reports").insert({
      reporter_id: access.userId,
      target_type: "account",
      target_id: access.item.otherAccountId,
      reason: parsed.data.reason,
    });
    if (error) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not report." } };
    }
  }

  const state = await readThreadState(access.userId);
  await writeThreadState({
    ...state,
    reports: [
      ...state.reports,
      {
        id: crypto.randomUUID(),
        conversationId: access.item.conversationId,
        reason: parsed.data.reason,
        createdAt: new Date().toISOString(),
      },
    ],
  });

  return { ok: true as const, data: { reported: true } };
}
