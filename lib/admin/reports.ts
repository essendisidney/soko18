import { requireStaff } from "@/lib/admin/staff";
import { createClient } from "@/lib/supabase/server";

export async function listAdminReports() {
  const staff = await requireStaff();
  if (!staff.ok) return staff;

  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, details, created_at, reporter_id")
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    ok: true as const,
    data: {
      items: (data ?? []).map((row) => ({
        id: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        reason: row.reason,
        createdAt: row.created_at,
      })),
    },
  };
}
