export const PROMOTION_KINDS = ["boost", "spotlight", "featured"] as const;
export type PromotionKind = (typeof PROMOTION_KINDS)[number];

export const PROMOTION_CATALOG: Record<
  PromotionKind,
  { amountKes: number; hours: number; ledgerType: PromotionKind; title: string; line: string }
> = {
  boost: { amountKes: 500, hours: 24, ledgerType: "boost", title: "Boost", line: "24 hours on Discover." },
  spotlight: { amountKes: 1200, hours: 4, ledgerType: "spotlight", title: "Spotlight", line: "4 hours of extra reach." },
  featured: { amountKes: 3500, hours: 168, ledgerType: "featured", title: "Featured", line: "7 days, labeled paid." },
};

export type LedgerRow = {
  id: string;
  accountId: string;
  transactionId: string;
  type: string;
  amountKes: number;
  direction: "debit" | "credit";
  profileId?: string;
};

export function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function ledgerCoversPromotion(
  entries: LedgerRow[],
  profileId: string,
  kind: PromotionKind | "adjustment",
) {
  return entries.some(
    (row) =>
      (row.type === kind || row.type === "adjustment") &&
      row.profileId === profileId &&
      row.amountKes > 0,
  );
}

export function canSetPaidUntil(input: {
  until: string | null | undefined;
  previousUntil?: string | null;
  kind: PromotionKind;
  profileId: string;
  accountId: string;
  ledger: LedgerRow[];
  now?: string;
}) {
  if (!input.until) return true;
  const now = Date.parse(input.now ?? new Date().toISOString());
  if (Date.parse(input.until) <= now) return true;
  if (input.previousUntil === input.until) return true;
  return ledgerCoversPromotion(
    input.ledger.filter((row) => row.accountId === input.accountId),
    input.profileId,
    input.kind,
  );
}

export function featuredAllowed(input: {
  featuredUntil: string | null | undefined;
  profileId: string;
  accountId: string;
  ledger: LedgerRow[];
  now?: string;
}) {
  return canSetPaidUntil({
    until: input.featuredUntil,
    kind: "featured",
    profileId: input.profileId,
    accountId: input.accountId,
    ledger: input.ledger,
    now: input.now,
  });
}

export function appendLedger(entries: LedgerRow[], row: LedgerRow) {
  return [...entries, row];
}

export function promotionUntil(kind: PromotionKind, fromIso: string) {
  const hours = PROMOTION_CATALOG[kind].hours;
  return new Date(Date.parse(fromIso) + hours * 60 * 60 * 1000).toISOString();
}
