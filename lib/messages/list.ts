import { currentUser } from "@/lib/auth/user";
import { listMatches } from "@/lib/likes/list";
import { isBlockedPair, pageMessages, type ThreadMessage } from "@/lib/messages/engine";
import { resolveThread } from "@/lib/messages/access";
import { readThreadState } from "@/lib/messages/state";
import { createClient } from "@/lib/supabase/server";

export async function listThreadMessages(conversationKey: string, cursor?: string | null) {
  const resolved = await resolveThread(conversationKey);
  if (!resolved.ok) return resolved;
  const { access } = resolved;

  if (access.persisted) {
    const supabase = await createClient();
    let query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", access.item.conversationId)
      .order("created_at", { ascending: true });
    if (cursor) query = query.lt("created_at", cursor);
    const { data } = await query;
    const page = pageMessages(
      (data ?? []).map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        body: row.body ?? "",
        createdAt: row.created_at,
      })),
      access.item.conversationId,
      cursor,
    );
    return {
      ok: true as const,
      data: {
        ...page,
        conversationId: access.item.conversationId,
        blocked: access.blocked,
        canSend: access.canSend,
        persisted: true,
      },
    };
  }

  const state = await readThreadState(access.userId);
  const page = pageMessages(state.messages, access.item.conversationId, cursor);
  return {
    ok: true as const,
    data: {
      ...page,
      conversationId: access.item.conversationId,
      blocked: access.blocked,
      canSend: access.canSend,
      persisted: false,
    },
  };
}

export async function listConversations() {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false as const,
      status: 401,
      error: { code: "unauthorized", message: "Sign in to message." },
    };
  }
  const matches = await listMatches();
  const state = await readThreadState(user.id);
  const lastByConvo = new Map<string, ThreadMessage>();
  for (const row of state.messages) {
    const prev = lastByConvo.get(row.conversationId);
    if (!prev || row.createdAt > prev.createdAt) lastByConvo.set(row.conversationId, row);
  }

  const items = matches.map((item) => {
    const last = lastByConvo.get(item.conversationId) ?? null;
    return {
      id: item.conversationId,
      slug: item.slug,
      name: item.name,
      photo: item.photo,
      blocked: isBlockedPair(user.id, item.otherAccountId, state.blocks),
      lastMessage: last?.body ?? null,
      createdAt: last?.createdAt ?? item.createdAt,
    };
  });

  return { ok: true as const, data: { items } };
}
