import { NextResponse } from "next/server";
import { verifyPaystackSignature } from "@/lib/payments/paystack";
import { createServiceClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Paystack webhook. Signature-checked; the ledger decides what happened. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as {
    event?: string;
    data?: { reference?: string; amount?: number; currency?: string; id?: number; gateway_response?: string };
  };
  const ref = event.data?.reference ?? "";
  const admin = createServiceClient();
  if (!admin || !UUID.test(ref)) return NextResponse.json({ ok: true });

  if (event.event === "charge.success") {
    await admin.rpc("settle_card_payment", {
      p_tx: ref,
      p_reference: `paystack:${event.data?.id ?? ref}`,
      p_amount: (event.data?.amount ?? 0) / 100,
      p_currency: event.data?.currency ?? "",
    });
  } else if (event.event === "charge.failed") {
    await admin.rpc("fail_card_payment", { p_tx: ref, p_desc: event.data?.gateway_response ?? "failed" });
  }
  return NextResponse.json({ ok: true });
}
