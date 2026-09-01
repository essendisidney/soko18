import { hasLocalAccess, pendingLocalAccess, settleLocalAccess, startLocalAccess } from "@/lib/payments/access-local";

export function hasSkipLine() {
  return hasLocalAccess("skip");
}

export function skipPending() {
  return pendingLocalAccess("skip");
}

/** Starts a pending skip. Does not grant review until settle. */
export function requestSkip() {
  return startLocalAccess("skip");
}

/** Sandbox settle. Staff review after a ledger row, never a fake queue. */
export function settleSkip() {
  const pending = pendingLocalAccess("skip");
  if (!pending) return false;
  return settleLocalAccess(pending.id).ok;
}
