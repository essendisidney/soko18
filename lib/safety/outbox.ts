import { createServiceClient } from "@/lib/supabase/admin";
import { outboxText, type OutboxRow } from "@/lib/safety/outbox-text";

/** Whether alerts can actually leave Kutana yet (emergency webhook, or SMS once chosen in K4). */
export function alertsReady() {
  return Boolean(process.env.EMERGENCY_WEBHOOK_URL);
}

/**
 * Sends due safety alerts to trusted contacts. The database decides what's due; this only
 * delivers and marks the result, retrying up to 5 times across calls.
 */
export async function deliverOutbox() {
  const admin = createServiceClient();
  if (!admin) return { sent: 0, failed: 0, skipped: "not configured" };
  const { data } = await admin.rpc("safety_outbox_due", { p_limit: 20 });
  const rows = (data ?? []) as OutboxRow[];
  const webhook = process.env.EMERGENCY_WEBHOOK_URL;
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    let ok = false;
    let error = "no delivery channel";
    if (webhook) {
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: row.kind === "all_clear" ? "checkin_all_clear" : "checkin_missed",
            contact: { name: row.contact_name, phone: row.contact_phone },
            text: outboxText(row),
            at: new Date().toISOString(),
          }),
        });
        ok = res.ok;
        error = ok ? "" : `webhook ${res.status}`;
      } catch {
        error = "webhook unreachable";
      }
    }
    await admin.rpc("safety_outbox_mark", { p_id: row.id, p_ok: ok, p_error: ok ? null : error });
    if (ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}
