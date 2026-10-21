/** Turning on phone notifications from the browser. Shared by Settings and the in-the-moment asks. */

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && Boolean(pushKey());
}

export async function pushEnabled() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  return Boolean(await reg.pushManager.getSubscription());
}

export type EnableResult = "on" | "blocked" | "failed";

export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported()) return "failed";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "blocked";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(pushKey()) });
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return res.ok ? "on" : "failed";
  } catch {
    return "failed";
  }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}

/** Each ask shows once per reason; "Not now" waits a week. */
const ASK_KEY = "kutana_push_ask";
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function shouldAsk(reason: string, raw: string | null, now = Date.now()) {
  try {
    const seen = JSON.parse(raw ?? "{}") as Record<string, number>;
    const at = seen[reason];
    return typeof at !== "number" || now - at > WEEK;
  } catch {
    return true;
  }
}

export function readAsks() {
  try {
    return localStorage.getItem(ASK_KEY);
  } catch {
    return null;
  }
}

export function markAsked(reason: string, now = Date.now()) {
  try {
    const seen = JSON.parse(localStorage.getItem(ASK_KEY) ?? "{}") as Record<string, number>;
    localStorage.setItem(ASK_KEY, JSON.stringify({ ...seen, [reason]: now }));
  } catch {}
}
