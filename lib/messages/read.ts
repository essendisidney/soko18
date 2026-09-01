import { resolveThread } from "@/lib/messages/access";
import { markThreadRead } from "@/lib/messages/engine";
import { readThreadState, writeThreadState } from "@/lib/messages/state";
import { createClient } from "@/lib/supabase/server";

export async function markConversationRead(conversationKey: string) {
  const resolved = await resolveThread(conversationKey);
  if (!resolved.ok) return resolved;
  const { access } = resolved;
  const now = new Date().toISOString();

  if (access.persisted) {
    const supabase = await createClient();
    await supabase
      .from("messages")
      .update({ read_at: now })
      .eq("conversation_id", access.item.conversationId)
      .neq("sender_id", access.userId)
      .is("read_at", null);
    return { ok: true as const, data: { read: true, persisted: true } };
  }

  const state = await readThreadState(access.userId);
  const next = markThreadRead(state.messages, access.item.conversationId, access.userId, now);
  if (next.changed) await writeThreadState({ ...state, messages: next.messages });
  return { ok: true as const, data: { read: true, persisted: false } };
}
