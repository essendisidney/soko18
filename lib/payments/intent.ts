import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { PROMOTION_CATALOG, PROMOTION_KINDS } from "@/lib/payments/ledger";
import { requestedProfileAllowed } from "@/lib/studio/own";
import { profileCanPromote } from "@/lib/studio/promote";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mpesaConfigured } from "@/lib/payments/daraja";

const bodySchema = z.object({
  kind: z.enum(PROMOTION_KINDS).default("boost"),
  profileId: z.string().uuid().optional().nullable(),
});

export async function createPaymentIntent(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to pay." } };
  }

  const parsed = bodySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Choose Boost, Spotlight, or Featured." } };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, account_id, status")
    .eq("account_id", user.id)
    .maybeSingle();

  if (!profile || profile.account_id !== user.id) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Create a profile first." } };
  }
  if (!profileCanPromote(profile.status)) {
    return {
      ok: false as const,
      status: 403,
      error: { code: "forbidden", message: "Boost after you’re live in Nairobi." },
    };
  }
  if (!requestedProfileAllowed(parsed.data.profileId ?? null, profile.id)) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "You can only promote your own profile." } };
  }

  const catalog = PROMOTION_CATALOG[parsed.data.kind];
  const provider = mpesaConfigured() ? "mpesa" : "sandbox";
  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      account_id: user.id,
      provider,
      provider_ref: `${provider}:${crypto.randomUUID()}`,
      amount_kes: catalog.amountKes,
      status: "pending",
      purpose: catalog.ledgerType,
    })
    .select("id, amount_kes, status, provider, purpose")
    .maybeSingle();

  if (error || !tx) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not start payment." } };
  }

  return {
    ok: true as const,
    data: {
      transactionId: tx.id,
      amountKes: tx.amount_kes,
      status: tx.status,
      provider: tx.provider,
      kind: parsed.data.kind,
      profileId: profile.id,
      boostWritten: false as const,
      featuredWritten: false as const,
    },
  };
}
