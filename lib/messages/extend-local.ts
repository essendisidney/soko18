import { recordExtendTap } from "@/lib/messages/extend";

const VOTES_KEY = "soko18_chat_extend";

type VoteMap = Record<string, string[]>;

function readAll(): VoteMap {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(VOTES_KEY) ?? "{}") as VoteMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readExtendVotes(conversationId: string) {
  return readAll()[conversationId] ?? [];
}

export function writeExtendVotes(conversationId: string, votes: string[]) {
  localStorage.setItem(VOTES_KEY, JSON.stringify({ ...readAll(), [conversationId]: votes }));
}

export function tapExtendLocal(conversationId: string, tapperId: string) {
  const next = recordExtendTap(readExtendVotes(conversationId), tapperId);
  writeExtendVotes(conversationId, next);
  return next;
}
