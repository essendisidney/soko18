/**
 * IntaSend (Kenya): M-Pesa STK push and a hosted checkout page (M-Pesa + cards).
 * Endpoints follow IntaSend's official SDK:
 *   POST /api/v1/payment/mpesa-stk-push/   (secret key)
 *   POST /api/v1/checkout/                 (publishable key)
 *   POST /api/v1/payment/status/           (publishable key)
 * Invoice states: NEW, PENDING, PROCESSING, COMPLETE, FAILED.
 * We never trust a webhook on its own: every settlement re-checks the invoice with IntaSend.
 */

const LIVE = "https://payment.intasend.com";
const SANDBOX = "https://sandbox.intasend.com";

function env() {
  return {
    publishable: process.env.INTASEND_PUBLISHABLE_KEY ?? "",
    secret: process.env.INTASEND_SECRET_KEY ?? "",
    test: process.env.INTASEND_TEST === "1" || (process.env.INTASEND_PUBLISHABLE_KEY ?? "").includes("_test_"),
  };
}

export function intasendConfigured() {
  const e = env();
  return Boolean(e.publishable && e.secret);
}

function base() {
  return env().test ? SANDBOX : LIVE;
}

export type IntasendInvoice = {
  invoice_id: string;
  state: string;
  provider?: string;
  value?: number | string;
  currency?: string;
  account?: string;
  api_ref?: string;
  mpesa_reference?: string | null;
  failed_reason?: string | null;
};

async function call<T>(path: string, body: Record<string, unknown>, auth: "secret" | "public") {
  const e = env();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    INTASEND_PUBLIC_API_KEY: e.publishable,
  };
  if (auth === "secret") headers.Authorization = `Bearer ${e.secret}`;
  try {
    const res = await fetch(`${base()}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, public_key: e.publishable }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as T | null;
    if (!res.ok || !json) return { ok: false as const, error: `IntaSend error ${res.status}` };
    return { ok: true as const, data: json };
  } catch {
    return { ok: false as const, error: "Couldn’t reach IntaSend. Try again." };
  }
}

/** Ask the member's phone for their M-Pesa PIN. api_ref is our transaction id. */
export async function intasendStkPush(input: { phone: string; amount: number; apiRef: string; email?: string | null }) {
  const result = await call<{ invoice?: IntasendInvoice }>(
    "/api/v1/payment/mpesa-stk-push/",
    {
      phone_number: input.phone,
      amount: input.amount,
      api_ref: input.apiRef,
      email: input.email ?? undefined,
      method: "M-PESA",
      currency: "KES",
      narrative: "SOKO",
    },
    "secret",
  );
  if (!result.ok) return result;
  const invoiceId = result.data.invoice?.invoice_id;
  if (!invoiceId) return { ok: false as const, error: "M-Pesa didn’t start. Try again." };
  return { ok: true as const, invoiceId };
}

/** Hosted checkout page (cards and M-Pesa). Returns the URL to send the member to. */
export async function intasendCheckout(input: {
  amount: number;
  currency: string;
  apiRef: string;
  email: string;
  redirectUrl: string;
}) {
  const result = await call<{ url?: string; id?: string }>(
    "/api/v1/checkout/",
    {
      amount: input.amount,
      currency: input.currency,
      api_ref: input.apiRef,
      email: input.email,
      redirect_url: input.redirectUrl,
      host: new URL(input.redirectUrl).origin,
    },
    "public",
  );
  if (!result.ok) return result;
  if (!result.data.url) return { ok: false as const, error: "Card payment didn’t start. Try again." };
  return { ok: true as const, url: result.data.url };
}

/** The source of truth for whether an invoice was paid. */
export async function intasendInvoiceStatus(invoiceId: string) {
  const result = await call<{ invoice?: IntasendInvoice }>("/api/v1/payment/status/", { invoice_id: invoiceId }, "public");
  if (!result.ok || !result.data.invoice) return null;
  return result.data.invoice;
}

/** Webhook challenge set in the IntaSend dashboard; empty means not configured (reject). */
export function intasendChallengeOk(challenge: unknown) {
  const expected = process.env.INTASEND_WEBHOOK_CHALLENGE ?? "";
  return Boolean(expected) && typeof challenge === "string" && challenge === expected;
}
