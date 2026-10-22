import { takeRateLimit } from "@/lib/security/limit";
import { dbLimitError } from "@/lib/security/db-errors";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type EmergencyKind = "panic" | "share";

export async function deliverEmergency(input: {
  accountId: string;
  kind: EmergencyKind;
  lat: number;
  lng: number;
  name: string;
  phone: string;
}) {
  const limited = takeRateLimit(input.kind === "panic" ? "panic" : "share", input.accountId);
  if (!limited.ok) return { ok: false as const, status: limited.status, error: limited.error, delivered: false };

  // Daily cap kept in the database. A panic alert must never be lost to a database hiccup,
  // so only a real limit (or a suspended account) stops it.
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_safety_send", { p_kind: input.kind });
    const blocked = dbLimitError(error?.message);
    if (blocked) return { ok: false as const, ...blocked, delivered: false };
  }

  const webhook = process.env.EMERGENCY_WEBHOOK_URL;
  let delivered = false;
  if (webhook) {
    try {
      const ping = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: input.accountId,
          kind: input.kind,
          contact: { name: input.name, phone: input.phone },
          lat: input.lat,
          lng: input.lng,
          at: new Date().toISOString(),
        }),
      });
      delivered = ping.ok;
    } catch {
      delivered = false;
    }
  }

  return { ok: true as const, delivered };
}
