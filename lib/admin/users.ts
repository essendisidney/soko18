import { requireStaff } from "@/lib/admin/staff";
import { createClient } from "@/lib/supabase/server";

export async function listAdminUsers() {
  const staff = await requireStaff();
  if (!staff.ok) return staff;

  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("id, display_name, role, last_seen_at, is_banned, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    ok: true as const,
    data: {
      items: (data ?? []).map((row) => ({
        id: row.id,
        name: row.display_name || "Account",
        role: row.role,
        lastSeenAt: row.last_seen_at,
        banned: Boolean(row.is_banned),
      })),
    },
  };
}
