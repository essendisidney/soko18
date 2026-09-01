import {
  hasSettledAccess,
  pendingAccess,
  settleAccess,
  spendAccess,
  startAccess,
  unusedSettledAccess,
  type AccessKind,
  type AccessLedgerRow,
} from "@/lib/payments/access";

export const ACCESS_LEDGER_KEY = "soko18_access_ledger";

export function readAccessLedger(): AccessLedgerRow[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCESS_LEDGER_KEY) ?? "[]") as AccessLedgerRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeAccessLedger(ledger: AccessLedgerRow[]) {
  localStorage.setItem(ACCESS_LEDGER_KEY, JSON.stringify(ledger.slice(-40)));
}

export function startLocalAccess(kind: AccessKind) {
  const next = startAccess(readAccessLedger(), kind);
  writeAccessLedger(next.ledger);
  return next.row;
}

export function settleLocalAccess(id: string) {
  const result = settleAccess(readAccessLedger(), id);
  if (!result.ok) return result;
  writeAccessLedger(result.ledger);
  return result;
}

export function hasLocalAccess(kind: AccessKind) {
  return hasSettledAccess(readAccessLedger(), kind);
}

export function pendingLocalAccess(kind: AccessKind) {
  return pendingAccess(readAccessLedger(), kind);
}

export function unusedLocalAccess(kind: AccessKind) {
  return unusedSettledAccess(readAccessLedger(), kind);
}

export function spendLocalAccess(id: string) {
  const result = spendAccess(readAccessLedger(), id);
  if (!result.ok) return result;
  writeAccessLedger(result.ledger);
  return result;
}
