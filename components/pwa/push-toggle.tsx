"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Matches, messages and likes as phone notifications. Lock-screen text never shows names. */
export function PushToggle() {
  const { user, configured } = useAuth();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && Boolean(key);
    setSupported(ok);
    if (!ok) return;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(Boolean(sub)))
      .catch(() => {});
  }, [key]);

  if (!configured || !user || !supported || !key) return null;

  async function enable() {
    setNote(null);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNote("Notifications are blocked in your browser settings.");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key!),
    });
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setEnabled(res.ok);
    setNote(res.ok ? "You’ll get a notification for new matches and messages." : "Could not turn on notifications.");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setEnabled(false);
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm text-muted">Notifications</h2>
      <p className="mt-2 text-sm text-muted">New matches, messages and likes. Your lock screen never shows names or messages.</p>
      <Button className="mt-4 w-full" variant={enabled ? "ghost" : "gold"} onClick={() => void (enabled ? disable() : enable())}>
        {enabled ? "Turn off notifications" : "Turn on notifications"}
      </Button>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
