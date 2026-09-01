import { z } from "zod";
import { appendMessage } from "@/lib/messages/engine";
import { resolveThread } from "@/lib/messages/access";
import { readThreadState, writeThreadState } from "@/lib/messages/state";
import { takeRateLimit } from "@/lib/security/limit";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function sendMessage(conversationKey: string, input: unknown) {
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Write a message." } };
  }

  const resolved = await resolveThread(conversationKey);
  if (!resolved.ok) return resolved;
  const { access } = resolved;

  const limited = takeRateLimit("messages", access.userId);
  if (!limited.ok) {
    return { ok: false as const, status: limited.status, error: limited.error };
  }

  if (!access.canSend) {
    return {
      ok: false as const,
      status: 403,
      error: { code: "forbidden", message: "You can’t message this person." },
    };
  }

  if (access.persisted) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: access.item.conversationId,
        sender_id: access.userId,
        body: parsed.data.body,
      })
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .maybeSingle();
    if (error || !data) {
      return {
        ok: false as const,
        status: 403,
        error: { code: "forbidden", message: "You can’t message this person." },
      };
    }
    return {
      ok: true as const,
      data: {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        body: data.body ?? "",
        createdAt: data.created_at,
        readAt: data.read_at,
        persisted: true,
      },
    };
  }

  const state = await readThreadState(access.userId);
  const next = appendMessage({
    actorId: access.userId,
    accountA: access.accountA,
    accountB: access.accountB,
    conversationId: access.item.conversationId,
    body: parsed.data.body,
    blocks: state.blocks,
    messages: state.messages,
  });
  if (!next.ok) {
    const status = next.code === "forbidden" ? 403 : next.code === "not_found" ? 404 : 400;
    const message =
      next.code === "forbidden" ? "You can’t message this person." : "Conversation unavailable.";
    return { ok: false as const, status, error: { code: next.code, message } };
  }
  await writeThreadState({ ...state, messages: next.messages });
  return { ok: true as const, data: { ...next.message, persisted: false } };
}
