import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const bodySchema = z.object({
  transactionId: z.string().uuid(),
});

export async function completeSandboxPayment(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to pay." } };
  }

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Missing payment." } };
  }

  const supabase = await createClient();
  const { data: tx } = await supabase
    .from("transactions")
    .select("id, account_id, provider, status, purpose")
    .eq("id", parsed.data.transactionId)
    .maybeSingle();

  if (!tx || tx.account_id !== user.id) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Payment not found." } };
  }
  if (tx.provider !== "sandbox") {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "This payment is not sandbox." } };
  }
  if (tx.status !== "pending") {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Payment already settled." } };
  }

  const { data, error } = await supabase.rpc("settle_sandbox_transaction", {
    p_tx: tx.id,
  });

  if (error || !data) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Settlement needs a ledger row." } };
  }

  return { ok: true as const, data };
}
