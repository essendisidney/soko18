export type BlockRow = {
  blockerId: string;
  blockedId: string;
};

export type ThreadMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};

export function otherAccount(actorId: string, accountA: string, accountB: string) {
  if (actorId === accountA) return accountB;
  if (actorId === accountB) return accountA;
  return null;
}

export function isParticipant(actorId: string, accountA: string, accountB: string) {
  return actorId === accountA || actorId === accountB;
}

export function isBlockedPair(actorId: string, otherId: string, blocks: BlockRow[]) {
  return blocks.some(
    (row) =>
      (row.blockerId === actorId && row.blockedId === otherId) ||
      (row.blockerId === otherId && row.blockedId === actorId),
  );
}

export function canReadThread(actorId: string, accountA: string, accountB: string) {
  return isParticipant(actorId, accountA, accountB);
}

export function canSendMessage(
  actorId: string,
  accountA: string,
  accountB: string,
  blocks: BlockRow[],
) {
  if (!isParticipant(actorId, accountA, accountB)) return false;
  const other = otherAccount(actorId, accountA, accountB);
  if (!other) return false;
  return !isBlockedPair(actorId, other, blocks);
}

export function appendMessage(input: {
  actorId: string;
  accountA: string;
  accountB: string;
  conversationId: string;
  body: string;
  blocks: BlockRow[];
  messages: ThreadMessage[];
  now?: string;
  id?: string;
}):
  | { ok: true; message: ThreadMessage; messages: ThreadMessage[] }
  | { ok: false; code: "not_found" | "forbidden" | "invalid" } {
  if (!canReadThread(input.actorId, input.accountA, input.accountB)) {
    return { ok: false, code: "not_found" };
  }
  if (!canSendMessage(input.actorId, input.accountA, input.accountB, input.blocks)) {
    return { ok: false, code: "forbidden" };
  }
  const body = input.body.trim();
  if (!body || body.length > 2000) {
    return { ok: false, code: "invalid" };
  }
  const message: ThreadMessage = {
    id: input.id ?? crypto.randomUUID(),
    conversationId: input.conversationId,
    senderId: input.actorId,
    body,
    createdAt: input.now ?? new Date().toISOString(),
    readAt: null,
  };
  return { ok: true, message, messages: [...input.messages, message] };
}

export function markThreadRead(
  messages: ThreadMessage[],
  conversationId: string,
  readerId: string,
  now: string,
) {
  let changed = false;
  const next = messages.map((row) => {
    if (row.conversationId !== conversationId) return row;
    if (row.senderId === readerId) return row;
    if (row.readAt) return row;
    changed = true;
    return { ...row, readAt: now };
  });
  return { messages: next, changed };
}

export function lastOwnReceipt(
  messages: ThreadMessage[],
  conversationId: string,
  actorId: string,
): "none" | "sent" | "read" {
  const own = messages.filter((row) => row.conversationId === conversationId && row.senderId === actorId);
  const last = own[own.length - 1];
  if (!last) return "none";
  return last.readAt ? "read" : "sent";
}

export function pageMessages(
  messages: ThreadMessage[],
  conversationId: string,
  cursor?: string | null,
  limit = 40,
) {
  const ordered = messages
    .filter((row) => row.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const sliced = cursor ? ordered.filter((row) => row.createdAt < cursor) : ordered;
  const start = Math.max(0, sliced.length - limit);
  const items = sliced.slice(start);
  return {
    items,
    nextCursor: start > 0 ? items[0]?.createdAt ?? null : null,
  };
}
