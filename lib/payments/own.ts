import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function listOwnPayments() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to view payments." } };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, amount_kes, status, provider, purpose, created_at")
    .eq("account_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    ok: true as const,
    data: {
      items: (data ?? []).map((row) => ({
        id: row.id,
        amountKes: row.amount_kes,
        status: row.status,
        provider: row.provider,
        purpose: row.purpose,
        createdAt: row.created_at,
      })),
    },
  };
}
