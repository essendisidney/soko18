import { listThreadMessages } from "@/lib/messages/list";
import { resolveThread } from "@/lib/messages/access";
import type { ThreadMessage } from "@/lib/messages/engine";

export type ThreadView = {
  open: boolean;
  conversationId: string | null;
  actorId: string | null;
  messages: ThreadMessage[];
  canSend: boolean;
  blocked: boolean;
  persisted: boolean;
};

export async function loadThread(id: string): Promise<ThreadView> {
  const resolved = await resolveThread(id);
  if (!resolved.ok) {
    return {
      open: false,
      conversationId: null,
      actorId: null,
      messages: [],
      canSend: false,
      blocked: false,
      persisted: false,
    };
  }
  const result = await listThreadMessages(id);
  if (!result.ok) {
    return {
      open: false,
      conversationId: null,
      actorId: resolved.access.userId,
      messages: [],
      canSend: false,
      blocked: false,
      persisted: false,
    };
  }
  return {
    open: true,
    conversationId: result.data.conversationId,
    actorId: resolved.access.userId,
    messages: result.data.items,
    canSend: result.data.canSend,
    blocked: result.data.blocked,
    persisted: result.data.persisted,
  };
}
