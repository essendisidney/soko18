/**
 * Safaricom Daraja STK Push. Sandbox until MPESA_* env is set.
 * Never treat a pending STK as a ledger row.
 */
export function mpesaConfigured() {
  return Boolean(
    process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_CALLBACK_SECRET,
  );
}

/** 0712…, 712…, +254712…, 254712… (and 01… numbers) → 2547XXXXXXXX. Null if not a Kenyan mobile. */
export function normalizeKenyanPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("254")) local = local.slice(3);
  else if (local.startsWith("0")) local = local.slice(1);
  if (!/^(7|1)\d{8}$/.test(local)) return null;
  return `254${local}`;
}

/** Daraja posts back here. The secret keeps strangers from faking a callback. */
export function mpesaCallbackUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://soko18.vercel.app";
  const secret = process.env.MPESA_CALLBACK_SECRET ?? "";
  return `${base}/api/payments/mpesa/callback?t=${encodeURIComponent(secret)}`;
}

export async function stkPush(input: {
  phone: string;
  amountKes: number;
  accountRef: string;
  description: string;
}) {
  if (!mpesaConfigured()) {
    return { ok: true as const, provider: "sandbox" as const, checkoutRequestId: null };
  }

  const base = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
  const tokenRes = await fetch(
    `${base}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`,
        ).toString("base64")}`,
      },
    },
  );
  if (!tokenRes.ok) {
    return { ok: false as const, error: "Could not start M-Pesa." };
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const token = tokenJson.access_token;
  if (!token) return { ok: false as const, error: "Could not start M-Pesa." };

  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  // Daraja expects Nairobi time (UTC+3).
  const timestamp = new Date(Date.now() + 3 * 60 * 60 * 1000)
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const phone = normalizeKenyanPhone(input.phone);
  if (!phone) return { ok: false as const, error: "Enter a Kenyan M-Pesa number." };

  const stkRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: input.amountKes,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: mpesaCallbackUrl(),
      AccountReference: input.accountRef.slice(0, 12),
      TransactionDesc: input.description.slice(0, 13),
    }),
  });

  const stkJson = (await stkRes.json().catch(() => null)) as {
    CheckoutRequestID?: string;
    ResponseCode?: string;
  } | null;
  if (!stkRes.ok || stkJson?.ResponseCode !== "0" || !stkJson.CheckoutRequestID) {
    return { ok: false as const, error: "M-Pesa did not start. Check the number and try again." };
  }
  return { ok: true as const, provider: "mpesa" as const, checkoutRequestId: stkJson.CheckoutRequestID };
}
