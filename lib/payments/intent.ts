import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { ledgerPurpose, PRODUCTS, SKUS } from "@/lib/payments/catalog";
import { mpesaConfigured, normalizeKenyanPhone, stkPush } from "@/lib/payments/daraja";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const bodySchema = z.object({
  sku: z.enum(SKUS).default("boost_1"),
  phone: z.string().trim().max(20).optional().nullable(),
});

/**
 * Start a purchase. Writes a pending transaction (RLS checks the price against
 * `public.products`), then sends an M-Pesa STK push when Daraja is configured.
 * Nothing is granted until the ledger row posts on settlement.
 */
export async function createPaymentIntent(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to pay." } };
  }

  const parsed = bodySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Choose something to buy." } };
  }

  const product = PRODUCTS[parsed.data.sku];
  const live = mpesaConfigured();
  const phone = parsed.data.phone ? normalizeKenyanPhone(parsed.data.phone) : null;
  if (live && !phone) {
    return {
      ok: false as const,
      status: 400,
      error: { code: "invalid_phone", message: "Enter your M-Pesa number, e.g. 0712 345 678." },
    };
  }

  const provider = live ? "mpesa" : "sandbox";
  const supabase = await createClient();
  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      account_id: user.id,
      provider,
      provider_ref: `${provider}:${crypto.randomUUID()}`,
      amount_kes: product.amountKes,
      status: "pending",
      purpose: ledgerPurpose(product),
      sku: product.sku,
    })
    .select("id, amount_kes, status, provider, sku")
    .maybeSingle();

  if (error || !tx) {
    return { ok: false as const, status: 403, error: { code: "forbidden", message: "Could not start payment." } };
  }

  if (live && phone) {
    const push = await stkPush({
      phone,
      amountKes: product.amountKes,
      accountRef: "SOKO18",
      description: product.title,
    });
    if (!push.ok || !push.checkoutRequestId) {
      return {
        ok: false as const,
        status: 502,
        error: { code: "mpesa_failed", message: push.ok ? "M-Pesa did not start." : push.error },
      };
    }
    const admin = createServiceClient();
    if (!admin) {
      return {
        ok: false as const,
        status: 500,
        error: { code: "misconfigured", message: "Payments are not fully configured." },
      };
    }
    await admin.rpc("attach_mpesa_checkout", {
      p_tx: tx.id,
      p_checkout: push.checkoutRequestId,
      p_phone: phone,
    });
  }

  return {
    ok: true as const,
    data: {
      transactionId: tx.id,
      amountKes: tx.amount_kes,
      status: tx.status,
      provider: tx.provider,
      sku: product.sku,
      title: product.title,
    },
  };
}

/** Poll a purchase the signed-in member started. */
export async function paymentStatus(transactionId: string) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in." } };
  }
  if (!z.string().uuid().safeParse(transactionId).success) {
    return { ok: false as const, status: 400, error: { code: "invalid", message: "Missing payment." } };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, status, sku, amount_kes, result_desc")
    .eq("id", transactionId)
    .eq("account_id", user.id)
    .maybeSingle();
  if (!data) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "Payment not found." } };
  }
  return {
    ok: true as const,
    data: {
      transactionId: data.id,
      status: data.status as string,
      sku: data.sku as string,
      amountKes: data.amount_kes as number,
      message: data.result_desc as string | null,
    },
  };
}
