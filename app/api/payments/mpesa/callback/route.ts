import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { parseStkCallback } from "@/lib/payments/callback";
import { callbackTokenOk, stkQueryPaid } from "@/lib/payments/daraja";

/**
 * Safaricom Daraja STK callback. Always answer 200 with ResultCode 0 so Daraja stops retrying;
 * the ledger decides what happened.
 */
export async function POST(request: Request) {
  const ack = NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  const token = new URL(request.url).searchParams.get("t");
  if (!callbackTokenOk(token)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = parseStkCallback(body);
  if (!result) return ack;

  const admin = createServiceClient();
  if (!admin) return ack;

  if (result.ok) {
    // Trust the callback only if Safaricom confirms it. If the check can't be made right now the
    // row stays pending, and the member's status check asks Safaricom again (lib/payments/intent.ts).
    if (!(await stkQueryPaid(result.checkoutRequestId))) return ack;
    await admin.rpc("settle_mpesa_checkout", {
      p_checkout: result.checkoutRequestId,
      p_receipt: result.receipt,
      p_amount: result.amountKes,
    });
  } else {
    await admin.rpc("fail_mpesa_checkout", {
      p_checkout: result.checkoutRequestId,
      p_desc: result.description,
    });
  }
  return ack;
}
