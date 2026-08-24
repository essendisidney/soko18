import { requireStaff } from "@/lib/admin/staff";
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
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;

  const [users, active, profiles, pending, reports, todayTx, monthTx] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("last_seen_at", `${today}T00:00:00.000Z`),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profile_media")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_review", "scanning"]),
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("amount_kes")
      .eq("status", "completed")
      .gte("created_at", `${today}T00:00:00.000Z`),
    supabase
      .from("transactions")
      .select("amount_kes")
      .eq("status", "completed")
      .gte("created_at", `${monthStart}T00:00:00.000Z`),
  ]);

  const sumKes = (rows: { amount_kes: number }[] | null) =>
    (rows ?? []).reduce((total, row) => total + (row.amount_kes ?? 0), 0);

  return {
    ok: true as const,
    data: {
      users: users.count ?? 0,
      activeToday: active.count ?? 0,
      profiles: profiles.count ?? 0,
      pendingReview: pending.count ?? 0,
      reports: reports.count ?? 0,
      revenueTodayKes: sumKes(todayTx.data),
      revenueMonthKes: sumKes(monthTx.data),
    } satisfies AdminOverview,
  };
}
