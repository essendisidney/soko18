import { applyFlag } from "@/lib/safety/flags";
import { readLocalIds, snapshotLocalIds, subscribeLocalIds, writeLocalIds } from "@/lib/safety/local-ids";

export const BLOCKS_KEY = "soko18_blocks";

export function subscribeBlocks(onChange: () => void) {
  return subscribeLocalIds(BLOCKS_KEY, onChange);
}

export function blocksSnapshot() {
  return snapshotLocalIds(BLOCKS_KEY);
}

export function readBlocks() {
  return readLocalIds(BLOCKS_KEY);
}

export function writeBlock(profileId: string, blocked: boolean) {
  writeLocalIds(BLOCKS_KEY, applyFlag(readBlocks(), profileId, blocked));
}

export function isBlocked(profileId: string) {
  return readBlocks().includes(profileId);
}
