import { requireStaff } from "@/lib/admin/staff";
import { createClient } from "@/lib/supabase/server";

export async function listAdminPayments() {
  const staff = await requireStaff();
  if (!staff.ok) return staff;

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, account_id, amount_kes, status, provider, purpose, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    ok: true as const,
    data: {
      items: (data ?? []).map((row) => ({
        id: row.id,
        accountId: row.account_id,
        amountKes: row.amount_kes,
        status: row.status,
        provider: row.provider,
        purpose: row.purpose,
        createdAt: row.created_at,
      })),
    },
  };
}
