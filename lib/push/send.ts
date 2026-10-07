import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/admin";

export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SECRET,
  );
}

type Admin = NonNullable<ReturnType<typeof createServiceClient>>;
type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };

function configureVapid() {
  webpush.setVapidDetails(
    `mailto:${process.env.PUSH_CONTACT_EMAIL || "essendisidney@gmail.com"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

/** Send one payload to each subscription; drop the ones the browser has retired. */
async function sendToSubscriptions(
  admin: Admin,
  subs: Subscription[],
  message: { title: string; body: string; href: string },
  ttlSeconds = 60 * 60 * 24,
) {
  const payload = JSON.stringify(message);
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: ttlSeconds },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
  return sent;
}

/**
 * Remind members who turned on push AND said yes to news ("marketing" consent, latest answer wins).
 * Nobody else gets a broadcast.
 */
export async function broadcastToOptedIn(message: { title: string; body: string; href: string }) {
  const admin = createServiceClient();
  if (!admin || !pushConfigured()) return { sent: 0, skipped: "push not configured" };
  configureVapid();

  const { data: rows } = await admin
    .from("consents")
    .select("account_id, granted, created_at")
    .eq("kind", "marketing")
    .order("created_at", { ascending: false });
  const latest = new Map<string, boolean>();
  for (const row of rows ?? []) {
    if (!latest.has(row.account_id)) latest.set(row.account_id, row.granted);
  }
  const optedIn = [...latest].filter(([, granted]) => granted).map(([id]) => id);
  if (optedIn.length === 0) return { sent: 0 };

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("account_id", optedIn);
  // A reminder is useless once the night is over.
  return { sent: await sendToSubscriptions(admin, subs ?? [], message, 60 * 60 * 2) };
}

/** Deliver one in-app notification to every browser the member enabled push on. */
export async function dispatchNotification(notificationId: string) {
  const admin = createServiceClient();
  if (!admin || !pushConfigured()) return { sent: 0 };
  configureVapid();

  const { data: note } = await admin
    .from("notifications")
    .select("account_id, title, body, href")
    .eq("id", notificationId)
    .maybeSingle();
  if (!note) return { sent: 0 };

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("account_id", note.account_id);

  // Lock-screen text stays discreet: no names, no message content.
  const sent = await sendToSubscriptions(admin, subs ?? [], {
    title: note.title,
    body: "Open Kutana to see it.",
    href: note.href ?? "/",
  });
  return { sent };
}
