/** Owner economics (K7). Real ledger numbers only; empty until real payments exist. */

export type Economics = {
  month: string;
  revenue: { country: string; currency: string; gross: number; fees: number; net: number; payments: number; payers: number }[];
  payingMembers: number;
  payingMembersKes: number;
  netKes: number;
  activeMembers: number;
  costs: { category: string; amountKes: number; note: string | null }[];
  costsKes: number;
  feesRecorded: boolean;
};

export const COST_CATEGORIES = ["hosting", "moderation", "sms", "marketing", "other"] as const;

/**
 * Break-even in shillings: paying members needed = costs ÷ net ARPPU, and members needed at the
 * current paying share. Null wherever there isn't real data to divide by.
 */
export function breakEven(e: Pick<Economics, "costsKes" | "netKes" | "payingMembersKes" | "payingMembers" | "activeMembers">) {
  const arppu = e.payingMembersKes > 0 ? e.netKes / e.payingMembersKes : null;
  const payingShare = e.activeMembers > 0 ? e.payingMembers / e.activeMembers : null;
  const payersNeeded = arppu && arppu > 0 && e.costsKes > 0 ? Math.ceil(e.costsKes / arppu) : null;
  const membersNeeded = payersNeeded !== null && payingShare && payingShare > 0 ? Math.ceil(payersNeeded / payingShare) : null;
  return { arppu, payingShare, payersNeeded, membersNeeded, covered: e.costsKes > 0 ? e.netKes >= e.costsKes : null };
}

/** "2026-10" from a query value, or null. */
export function monthParam(value: string | undefined) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? `${value}-01` : null;
}
