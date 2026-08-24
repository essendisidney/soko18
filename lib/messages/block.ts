import { resolveThread } from "@/lib/messages/access";
import { readThreadState, writeThreadState } from "@/lib/messages/state";
import { createClient } from "@/lib/supabase/server";

export async function blockConversation(conversationKey: string) {
  const resolved = await resolveThread(conversationKey);
  if (!resolved.ok) return resolved;
  const { access } = resolved;
  const other = access.item.otherAccountId;
  if (!other || other === access.userId) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "You can’t block this person." } };
  }

  if (access.persisted) {
    const supabase = await createClient();
    const { error } = await supabase.from("blocks").upsert({
      blocker_id: access.userId,
      blocked_id: other,
    });
    if (error) {
      return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not block." } };
    }
  }

  const state = await readThreadState(access.userId);
  const exists = state.blocks.some((row) => row.blockerId === access.userId && row.blockedId === other);
  if (!exists) {
    await writeThreadState({
      ...state,
      blocks: [...state.blocks, { blockerId: access.userId, blockedId: other }],
    });
  }

  return { ok: true as const, data: { blocked: true, canSend: false } };
}
