import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { ledgerPurpose, PRODUCTS, SKUS } from "@/lib/payments/catalog";
import { mpesaConfigured, normalizeKenyanPhone, stkPush } from "@/lib/payments/daraja";
import { initializePaystack, paystackConfigured } from "@/lib/payments/paystack";
import { intasendCheckout, intasendConfigured, intasendStkPush } from "@/lib/payments/intasend";
import { reconcileIntasend } from "@/lib/payments/intasend-settle";
import { getMarket, pricesFor, resolveCountry } from "@/lib/markets/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const bodySchema = z.object({
  sku: z.enum(SKUS).default("boost_1"),
  phone: z.string().trim().max(20).optional().nullable(),
  method: z.enum(["mpesa", "card"]).optional().nullable(),
});

type Fail = { ok: false; status: number; error: { code: string; message: string } };
const fail = (status: number, code: string, message: string): Fail => ({ ok: false, status, error: { code, message } });

/**
 * Start a purchase in the member's market and currency.
 * Kenya: M-Pesa STK (default) or card. Other live markets: card via Paystack.
 * With no provider configured, a sandbox row lets you test end to end.
 * Nothing is granted until the ledger posts on settlement.
 */
export async function createPaymentIntent(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return fail(401, "unauthorized", "Sign in to pay.");

  const parsed = bodySchema.safeParse(input ?? {});
  if (!parsed.success) return fail(400, "invalid", "Choose something to buy.");

  const product = PRODUCTS[parsed.data.sku];
  const country = await resolveCountry();
  const market = await getMarket(country);
  if (market && market.status !== "live") {
    return fail(403, "market_closed", `SOKO18 isn’t open in ${market.name} yet. Join the waitlist and we’ll tell you.`);
  }
  const price = (await pricesFor(country)).find((p) => p.sku === product.sku);
  if (!price) return fail(400, "invalid", "This isn’t available in your country yet.");

  const providers = market?.payment_providers ?? ["mpesa"];
  const wantsCard = parsed.data.method === "card" || !providers.includes("mpesa");
  let provider: "mpesa" | "paystack" | "intasend" | "sandbox" = "sandbox";
  // IntaSend first (M-Pesa STK, or its hosted page for cards), then Daraja / Paystack.
  if (providers.includes("intasend") && price.currency === "KES" && intasendConfigured()) provider = "intasend";
  else if (wantsCard && providers.includes("paystack") && paystackConfigured()) provider = "paystack";
  else if (!wantsCard && price.currency === "KES" && mpesaConfigured()) provider = "mpesa";

  const phone = parsed.data.phone ? normalizeKenyanPhone(parsed.data.phone) : null;
  if ((provider === "mpesa" || (provider === "intasend" && !wantsCard)) && !phone) {
    return fail(400, "invalid_phone", "Enter your M-Pesa number, e.g. 0712 345 678.");
  }

  const supabase = await createClient();
  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      account_id: user.id,
      provider,
      provider_ref: `${provider}:${crypto.randomUUID()}`,
      amount_kes: Math.round(price.amount),
      amount: price.amount,
      currency: price.currency,
      country_code: country,
      status: "pending",
      purpose: ledgerPurpose(product),
      sku: product.sku,
    })
    .select("id, amount, currency, status, provider, sku")
    .maybeSingle();

  if (error || !tx) return fail(403, "forbidden", "Could not start payment.");

  let authorizationUrl: string | null = null;

  if (provider === "mpesa" && phone) {
    const push = await stkPush({ phone, amountKes: Math.round(price.amount), accountRef: "SOKO18", description: product.title });
    if (!push.ok || !push.checkoutRequestId) {
      return fail(502, "mpesa_failed", push.ok ? "M-Pesa did not start." : push.error);
    }
    const admin = createServiceClient();
    if (!admin) return fail(500, "misconfigured", "Payments are not fully configured.");
    await admin.rpc("attach_mpesa_checkout", { p_tx: tx.id, p_checkout: push.checkoutRequestId, p_phone: phone });
  }

  if (provider === "intasend") {
    const admin = createServiceClient();
    if (!admin) return fail(500, "misconfigured", "Payments are not fully configured.");
    if (!wantsCard && phone) {
      const push = await intasendStkPush({ phone, amount: price.amount, apiRef: tx.id, email: user.email });
      if (!push.ok) {
        await admin.rpc("fail_intasend", { p_tx: tx.id, p_desc: push.error });
        return fail(502, "mpesa_failed", push.error);
      }
      await admin.rpc("attach_intasend_invoice", { p_tx: tx.id, p_invoice: push.invoiceId, p_phone: phone });
    } else {
      if (!user.email) return fail(400, "no_email", "Add an email to your account to pay by card.");
      const base = process.env.NEXT_PUBLIC_APP_URL || "https://soko18.vercel.app";
      const page = await intasendCheckout({
        amount: price.amount,
        currency: price.currency,
        apiRef: tx.id,
        email: user.email,
        redirectUrl: `${base}/upgrade?paid=${tx.id}`,
      });
      if (!page.ok) {
        await admin.rpc("fail_intasend", { p_tx: tx.id, p_desc: page.error });
        return fail(502, "card_failed", page.error);
      }
      authorizationUrl = page.url;
    }
  }

  if (provider === "paystack") {
    if (!user.email) return fail(400, "no_email", "Add an email to your account to pay by card.");
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://soko18.vercel.app";
    const init = await initializePaystack({
      email: user.email,
      amount: price.amount,
      currency: price.currency,
      reference: tx.id,
      callbackUrl: `${base}/upgrade?paid=${tx.id}`,
      metadata: { sku: product.sku, account: user.id },
    });
    if (!init.ok) return fail(502, "card_failed", init.error);
    authorizationUrl = init.authorizationUrl;
  }

  return {
    ok: true as const,
    data: {
      transactionId: tx.id as string,
      amount: Number(tx.amount),
      currency: tx.currency as string,
      status: tx.status as string,
      provider: tx.provider as string,
      sku: product.sku,
      title: product.title,
      authorizationUrl,
    },
  };
}

/** Poll a purchase the signed-in member started. */
export async function paymentStatus(transactionId: string) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return fail(401, "unauthorized", "Sign in.");
  if (!z.string().uuid().safeParse(transactionId).success) return fail(400, "invalid", "Missing payment.");
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, status, sku, amount, currency, result_desc, provider, checkout_request_id")
    .eq("id", transactionId)
    .eq("account_id", user.id)
    .maybeSingle();
  if (!data) return fail(404, "not_found", "Payment not found.");
  // IntaSend: don't wait for the webhook — ask IntaSend directly while the member waits.
  if (data.provider === "intasend" && data.status === "pending" && data.checkout_request_id) {
    const checked = await reconcileIntasend(data.checkout_request_id as string, data.id as string);
    if (checked.status === "completed" || checked.status === "failed") {
      data.status = checked.status;
    }
  }
  return {
    ok: true as const,
    data: {
      transactionId: data.id as string,
      status: data.status as string,
      sku: data.sku as string,
      amount: Number(data.amount),
      currency: data.currency as string,
      message: data.result_desc as string | null,
    },
  };
}
