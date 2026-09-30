import { z } from "zod";

const itemSchema = z.object({ Name: z.string(), Value: z.union([z.string(), z.number()]).optional() });

const callbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      CheckoutRequestID: z.string(),
      ResultCode: z.union([z.number(), z.string()]),
      ResultDesc: z.string().optional().default(""),
      CallbackMetadata: z.object({ Item: z.array(itemSchema) }).optional(),
    }),
  }),
});

export type StkResult =
  | { ok: true; checkoutRequestId: string; receipt: string; amountKes: number; phone: string | null }
  | { ok: false; checkoutRequestId: string; description: string };

/** Turn a Daraja STK callback body into a settle or fail instruction. Null if it isn't one. */
export function parseStkCallback(body: unknown): StkResult | null {
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) return null;
  const cb = parsed.data.Body.stkCallback;
  const code = Number(cb.ResultCode);
  if (code !== 0) {
    return { ok: false, checkoutRequestId: cb.CheckoutRequestID, description: cb.ResultDesc || `code_${code}` };
  }
  const items = cb.CallbackMetadata?.Item ?? [];
  const value = (name: string) => items.find((item) => item.Name === name)?.Value;
  const receipt = value("MpesaReceiptNumber");
  const amount = Number(value("Amount"));
  if (typeof receipt !== "string" || !Number.isFinite(amount)) {
    return { ok: false, checkoutRequestId: cb.CheckoutRequestID, description: "missing_metadata" };
  }
  const phone = value("PhoneNumber");
  return {
    ok: true,
    checkoutRequestId: cb.CheckoutRequestID,
    receipt,
    amountKes: Math.round(amount),
    phone: phone == null ? null : String(phone),
  };
}
