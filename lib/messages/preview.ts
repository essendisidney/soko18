import { isBlockedPair, type BlockRow } from "@/lib/messages/engine";

export type LastPreview = {
  body: string;
  createdAt: string;
};

export function matchPreview(lastMessage: string | null | undefined) {
  const text = lastMessage?.trim();
  return text ? text : "Say hello";
}

export function lastMessageMap(
  messages: Array<{ conversationId: string; body: string; createdAt: string }>,
): Map<string, LastPreview> {
  const map = new Map<string, LastPreview>();
  for (const row of messages) {
    mergeLastPreview(map, row.conversationId, row.body, row.createdAt);
  }
  return map;
}

export function mergeLastPreview(
  map: Map<string, LastPreview>,
  conversationId: string,
  body: string,
  createdAt: string,
) {
  const prev = map.get(conversationId);
  if (!prev || createdAt > prev.createdAt) {
    map.set(conversationId, { body, createdAt });
  }
}

export function applyThreadPreview<
  T extends { conversationId: string; createdAt: string; otherAccountId: string },
>(
  items: T[],
  actorId: string,
  lastByConvo: Map<string, LastPreview>,
  blocks: BlockRow[],
): Array<T & { lastMessage: string | null }> {
  return items
    .filter((item) => !isBlockedPair(actorId, item.otherAccountId, blocks))
    .map((item) => {
      const last = lastByConvo.get(item.conversationId);
      return {
        ...item,
        lastMessage: last?.body ?? null,
        createdAt: last && last.createdAt > item.createdAt ? last.createdAt : item.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
