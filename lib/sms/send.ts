/**
 * SMS, off until the owner picks a provider (KUTANA_NEXT K4.2: least cost wins). Africa's Talking
 * is wired as the first adapter because it covers Kenya and most launch markets; set
 * AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY (and optionally SMS_SENDER_ID) to turn it on.
 * Used only for safety check-in alerts to a trusted contact until member SMS is approved.
 */

export function smsReady() {
  return Boolean(process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY);
}

/** Keep alerts to one SMS segment where possible, and never longer than three. */
export function smsText(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 459 ? `${clean.slice(0, 456)}...` : clean;
}

export async function sendSms(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  if (!username || !apiKey) return { ok: false, error: "sms not configured" };
  const host = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
  const body = new URLSearchParams({ username, to, message: smsText(text) });
  if (process.env.SMS_SENDER_ID) body.set("from", process.env.SMS_SENDER_ID);
  try {
    const res = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return { ok: false, error: `sms ${res.status}` };
    const json = (await res.json().catch(() => null)) as { SMSMessageData?: { Recipients?: { status?: string }[] } } | null;
    const status = json?.SMSMessageData?.Recipients?.[0]?.status ?? "";
    return status === "Success" ? { ok: true } : { ok: false, error: `sms ${status || "rejected"}` };
  } catch {
    return { ok: false, error: "sms unreachable" };
  }
}
