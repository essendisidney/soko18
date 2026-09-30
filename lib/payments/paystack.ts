import crypto from "node:crypto";

/** Paystack: cards (and local methods) for Kenya, Nigeria, Ghana, South Africa and more. No monthly fee. */
export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

/** Paystack wants the smallest currency unit (cents, kobo…). */
export function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

export async function initializePaystack(input: {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: toMinorUnits(input.amount),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    status?: boolean;
    data?: { authorization_url?: string };
    message?: string;
  } | null;
  if (!res.ok || !json?.status || !json.data?.authorization_url) {
    return { ok: false as const, error: json?.message ?? "Card payment did not start." };
  }
  return { ok: true as const, authorizationUrl: json.data.authorization_url };
}

/** Webhook signature: HMAC-SHA512 of the raw body with the secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
