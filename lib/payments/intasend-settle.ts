import { createServiceClient } from "@/lib/supabase/admin";
import { intasendInvoiceStatus } from "@/lib/payments/intasend";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ask IntaSend what happened to an invoice and post the result.
 * Only a COMPLETE invoice whose api_ref is our transaction, with the same amount and currency, grants anything.
 */
export async function reconcileIntasend(invoiceId: string, expectedTx?: string) {
  const admin = createServiceClient();
  if (!admin || !invoiceId) return { status: "unknown" as const };
  const invoice = await intasendInvoiceStatus(invoiceId);
  if (!invoice) return { status: "unknown" as const };
  const tx = invoice.api_ref ?? "";
  if (!UUID.test(tx) || (expectedTx && tx !== expectedTx)) return { status: "unknown" as const };

  const state = (invoice.state ?? "").toUpperCase();
  if (state === "COMPLETE") {
    const { error } = await admin.rpc("settle_intasend", {
      p_tx: tx,
      p_invoice: invoice.invoice_id,
      p_amount: Number(invoice.value ?? 0),
      p_currency: invoice.currency ?? "KES",
      p_receipt: invoice.mpesa_reference ? `mpesa:${invoice.mpesa_reference}` : `intasend:${invoice.invoice_id}`,
    });
    return { status: error ? ("invalid" as const) : ("completed" as const) };
  }
  if (state === "FAILED") {
    await admin.rpc("fail_intasend", { p_tx: tx, p_desc: invoice.failed_reason ?? "failed" });
    return { status: "failed" as const };
  }
  return { status: "pending" as const };
}
