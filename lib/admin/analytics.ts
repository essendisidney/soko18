import { requireStaff } from "@/lib/admin/staff";
import { nairobiDay, nairobiRangeStart, shiftDay } from "@/lib/analytics/day";
import { revenueKes } from "@/lib/analytics/engine";
import { createClient } from "@/lib/supabase/server";

export type AdminAnalytics = {
  impressionsToday: number;
  likesToday: number;
  matchesToday: number;
  revenueTodayKes: number;
  revenueMonthKes: number;
};

export async function ledgerRevenue(fromIso: string, toIso: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ledger_entries")
    .select("type, direction, amount_kes, created_at")
    .eq("type", "payment")
    .eq("direction", "debit")
    .gte("created_at", fromIso)
    .lt("created_at", toIso);

  return revenueKes(
    (data ?? []).map((row) => ({
      type: row.type,
      direction: row.direction as "debit" | "credit",
      amountKes: row.amount_kes,
      createdAt: row.created_at,
    })),
    fromIso,
    toIso,
  );
}

export async function getAdminAnalytics(): Promise<
  | { ok: true; data: AdminAnalytics }
  | { ok: false; status: number; error: { code: string; message: string } }
> {
  const staff = await requireStaff();
  if (!staff.ok) return staff;

  const supabase = await createClient();
  const today = nairobiDay();
  const tomorrow = shiftDay(today, 1);
  const monthStart = `${today.slice(0, 8)}01`;
  const fromToday = nairobiRangeStart(today);
  const fromTomorrow = nairobiRangeStart(tomorrow);
  const fromMonth = nairobiRangeStart(monthStart);

  const [impressions, likes, matches, revenueTodayKes, revenueMonthKes] = await Promise.all([
    supabase
      .from("profile_impressions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromToday)
      .lt("created_at", fromTomorrow),
    supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .in("kind", ["like", "spotlight"])
      .gte("created_at", fromToday)
      .lt("created_at", fromTomorrow),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromToday)
      .lt("created_at", fromTomorrow),
    ledgerRevenue(fromToday, fromTomorrow),
    ledgerRevenue(fromMonth, fromTomorrow),
  ]);

  return {
    ok: true as const,
    data: {
      impressionsToday: impressions.count ?? 0,
      likesToday: likes.count ?? 0,
      matchesToday: matches.count ?? 0,
      revenueTodayKes,
      revenueMonthKes,
    },
  };
}
