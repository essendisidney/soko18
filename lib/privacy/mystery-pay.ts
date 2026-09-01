import {
  pendingLocalAccess,
  settleLocalAccess,
  spendLocalAccess,
  startLocalAccess,
  unusedLocalAccess,
} from "@/lib/payments/access-local";
import { ACCESS_CATALOG } from "@/lib/payments/catalog";
import { formatKes } from "@/lib/payments/ledger";

export type MysteryPay = "idle" | "pending" | "ready";

export function mysteryPhase(): MysteryPay {
  if (unusedLocalAccess("mystery")) return "ready";
  if (pendingLocalAccess("mystery")) return "pending";
  return "idle";
}

export function mysteryPayLabel(phase: MysteryPay) {
  if (phase === "ready") return "Mystery · one card";
  if (phase === "pending") return `${formatKes(ACCESS_CATALOG.mystery.amountKes)} · Settle sandbox`;
  return `Mystery · ${formatKes(ACCESS_CATALOG.mystery.amountKes)}`;
}

/** Settle or start. Returns true when a spent row just paid for one card. */
export function takeMysteryCard() {
  const unused = unusedLocalAccess("mystery");
  if (unused) {
    spendLocalAccess(unused.id);
    return true;
  }
  const pending = pendingLocalAccess("mystery");
  if (pending) {
    if (!settleLocalAccess(pending.id).ok) return false;
    const row = unusedLocalAccess("mystery");
    if (!row) return false;
    spendLocalAccess(row.id);
    return true;
  }
  startLocalAccess("mystery");
  return false;
}
