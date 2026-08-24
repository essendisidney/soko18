import { requireStaff } from "@/lib/admin/staff";
import { ledgerRevenue } from "@/lib/admin/analytics";
import { nairobiDay, nairobiRangeStart, shiftDay } from "@/lib/analytics/day";
import { createClient } from "@/lib/supabase/server";

export type AdminOverview = {
  users: number;
  activeToday: number;
  profiles: number;
  pendingReview: number;
  reports: number;
  revenueTodayKes: number;
  revenueMonthKes: number;
};

export async function getAdminOverview(): Promise<
  | { ok: true; data: AdminOverview }
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

  const [users, active, profiles, pending, reports, revenueTodayKes, revenueMonthKes] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("last_seen_at", fromToday),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profile_media")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_review", "scanning"]),
    supabase.from("reports").select("id", { count: "exact", head: true }),
    ledgerRevenue(fromToday, fromTomorrow),
    ledgerRevenue(fromMonth, fromTomorrow),
  ]);

  return {
    ok: true as const,
    data: {
      users: users.count ?? 0,
      activeToday: active.count ?? 0,
      profiles: profiles.count ?? 0,
      pendingReview: pending.count ?? 0,
      reports: reports.count ?? 0,
      revenueTodayKes,
      revenueMonthKes,
    } satisfies AdminOverview,
  };
}
