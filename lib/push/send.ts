import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/admin";

export function pushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SECRET,
  );
}

/** Deliver one in-app notification to every browser the member enabled push on. */
export async function dispatchNotification(notificationId: string) {
  const admin = createServiceClient();
  if (!admin || !pushConfigured()) return { sent: 0 };
  webpush.setVapidDetails(
    `mailto:${process.env.PUSH_CONTACT_EMAIL || "essendisidney@gmail.com"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

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
  const payload = JSON.stringify({ title: note.title, body: "Open Kutana to see it.", href: note.href ?? "/" });
  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 * 24 },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
  return { sent };
}
