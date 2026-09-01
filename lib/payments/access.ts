import { LOCAL_ACCESS } from "@/lib/payments/catalog";

export type AccessKind = keyof typeof LOCAL_ACCESS;

export type AccessLedgerRow = {
  id: string;
  kind: AccessKind;
  amountKes: number;
  status: "pending" | "settled" | "spent";
  at: string;
};

export function startAccess(
  ledger: AccessLedgerRow[],
  kind: AccessKind,
  now = new Date().toISOString(),
  id = crypto.randomUUID(),
): { ledger: AccessLedgerRow[]; row: AccessLedgerRow } {
  const existing = ledger.find((row) => row.kind === kind && row.status === "pending");
  if (existing) return { ledger, row: existing };
  const row: AccessLedgerRow = {
    id,
    kind,
    amountKes: LOCAL_ACCESS[kind].amountKes,
    status: "pending",
    at: now,
  };
  return { ledger: [...ledger, row], row };
}

export function settleAccess(
  ledger: AccessLedgerRow[],
  id: string,
): { ok: true; ledger: AccessLedgerRow[] } | { ok: false; reason: "missing" | "settled" | "spent" } {
  const current = ledger.find((row) => row.id === id);
  if (!current) return { ok: false, reason: "missing" };
  if (current.status === "settled") return { ok: false, reason: "settled" };
  if (current.status === "spent") return { ok: false, reason: "spent" };
  return {
    ok: true,
    ledger: ledger.map((row) => (row.id === id ? { ...row, status: "settled" as const } : row)),
  };
}

export function spendAccess(
  ledger: AccessLedgerRow[],
  id: string,
): { ok: true; ledger: AccessLedgerRow[] } | { ok: false; reason: "missing" | "pending" | "spent" } {
  const current = ledger.find((row) => row.id === id);
  if (!current) return { ok: false, reason: "missing" };
  if (current.status === "pending") return { ok: false, reason: "pending" };
  if (current.status === "spent") return { ok: false, reason: "spent" };
  return {
    ok: true,
    ledger: ledger.map((row) => (row.id === id ? { ...row, status: "spent" as const } : row)),
  };
}

export function hasSettledAccess(ledger: AccessLedgerRow[], kind: AccessKind) {
  return ledger.some((row) => row.kind === kind && row.status === "settled");
}

export function pendingAccess(ledger: AccessLedgerRow[], kind: AccessKind) {
  return ledger.find((row) => row.kind === kind && row.status === "pending") ?? null;
}

export function unusedSettledAccess(ledger: AccessLedgerRow[], kind: AccessKind) {
  return ledger.find((row) => row.kind === kind && row.status === "settled") ?? null;
}
