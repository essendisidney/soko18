const TTL_KEY = "soko18_chat_ttl";

type TtlMap = Record<string, string>;

function readAll(): TtlMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(TTL_KEY) ?? "{}") as TtlMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readChatExpiry(conversationId: string) {
  return readAll()[conversationId] ?? null;
}

export function writeChatExpiry(conversationId: string, expiresAt: string) {
  const next = { ...readAll(), [conversationId]: expiresAt };
  localStorage.setItem(TTL_KEY, JSON.stringify(next));
}

export function ensureChatExpiry(conversationId: string, openedAt: string, compute: (openedAt: string) => string) {
  const existing = readChatExpiry(conversationId);
  if (existing) return existing;
  const expiresAt = compute(openedAt);
  writeChatExpiry(conversationId, expiresAt);
  return expiresAt;
}
