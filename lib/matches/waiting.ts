import { applyFlag } from "@/lib/safety/flags";
import { readLocalIds, snapshotLocalIds, subscribeLocalIds, writeLocalIds } from "@/lib/safety/local-ids";

export const MATCH_WAITING_KEY = "soko18_match_waiting";
export const MATCH_SEEN_KEY = "soko18_match_seen";

export function subscribeMatchWaiting(onChange: () => void) {
  return subscribeLocalIds(MATCH_WAITING_KEY, onChange);
}

export function matchWaitingSnapshot() {
  return snapshotLocalIds(MATCH_WAITING_KEY);
}

export function subscribeMatchSeen(onChange: () => void) {
  return subscribeLocalIds(MATCH_SEEN_KEY, onChange);
}

export function matchSeenSnapshot() {
  return snapshotLocalIds(MATCH_SEEN_KEY);
}

export function writeMatchWaiting(profileId: string, waiting: boolean) {
  writeLocalIds(MATCH_WAITING_KEY, applyFlag(readLocalIds(MATCH_WAITING_KEY), profileId, waiting));
}

export function markMatchSeen(profileId: string) {
  writeLocalIds(MATCH_SEEN_KEY, applyFlag(readLocalIds(MATCH_SEEN_KEY), profileId, true));
  writeMatchWaiting(profileId, false);
}

export function isFreshMatch(lastMessage: string | null | undefined, seen: boolean) {
  return !lastMessage?.trim() && !seen;
}
