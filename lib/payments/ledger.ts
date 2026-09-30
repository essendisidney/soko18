export { PRODUCTS, type Sku } from "@/lib/payments/catalog";

export type LedgerRow = {
  id: string;
  accountId: string;
  transactionId: string;
  type: string;
  amountKes: number;
  direction: "debit" | "credit";
};

export function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function appendLedger(entries: LedgerRow[], row: LedgerRow) {
  return [...entries, row];
}

/** A settled payment always has one debit and one matching credit for the same transaction. */
export function ledgerBalanced(entries: LedgerRow[], transactionId: string) {
  const rows = entries.filter((row) => row.transactionId === transactionId);
  const debit = rows.filter((row) => row.direction === "debit").reduce((sum, row) => sum + row.amountKes, 0);
  const credit = rows.filter((row) => row.direction === "credit").reduce((sum, row) => sum + row.amountKes, 0);
  return rows.length > 0 && debit === credit;
}

/** Boosts stack: a new Boost starts when the current one ends. */
export function boostUntil(currentUntil: string | null | undefined, nowIso: string, minutes: number) {
  const now = Date.parse(nowIso);
  const current = currentUntil ? Date.parse(currentUntil) : 0;
  const start = Math.max(now, Number.isFinite(current) ? current : 0);
  return new Date(start + minutes * 60 * 1000).toISOString();
}
