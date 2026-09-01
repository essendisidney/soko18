/**
 * Safaricom Daraja STK Push. Sandbox until MPESA_* env is set.
 * Never treat a pending STK as a ledger row.
 */
export function mpesaConfigured() {
  return Boolean(
    process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET,
  );
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
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const phone = input.phone.replace(/\D/g, "").replace(/^0/, "254");

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
      CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL || "https://soko18.vercel.app"}/api/payments/mpesa/callback`,
      AccountReference: input.accountRef.slice(0, 12),
      TransactionDesc: input.description.slice(0, 13),
    }),
  });

  const stkJson = (await stkRes.json().catch(() => null)) as {
    CheckoutRequestID?: string;
    ResponseCode?: string;
  } | null;
  if (!stkRes.ok || stkJson?.ResponseCode !== "0" || !stkJson.CheckoutRequestID) {
    return { ok: false as const, error: "M-Pesa did not start. Try sandbox or check the shortcode." };
  }
  return { ok: true as const, provider: "mpesa" as const, checkoutRequestId: stkJson.CheckoutRequestID };
}
