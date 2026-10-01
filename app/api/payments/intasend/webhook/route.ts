import { NextResponse } from "next/server";
import { intasendChallengeOk } from "@/lib/payments/intasend";
import { reconcileIntasend } from "@/lib/payments/intasend-settle";

/**
 * IntaSend collection webhook. Checks the challenge you set in the IntaSend dashboard,
 * then re-verifies the invoice with IntaSend before anything is granted.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { invoice_id?: string; challenge?: string; api_ref?: string }
    | null;
  if (!body || !intasendChallengeOk(body.challenge)) {
    return NextResponse.json({ error: "bad challenge" }, { status: 401 });
  }
  if (body.invoice_id) await reconcileIntasend(body.invoice_id, body.api_ref);
  return NextResponse.json({ ok: true });
}
