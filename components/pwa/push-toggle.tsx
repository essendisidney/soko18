"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";
import { disablePush, enablePush, pushEnabled, pushKey, pushSupported } from "@/lib/push/client";

/** Matches, messages and likes as phone notifications. Lock-screen text never shows names. */
export function PushToggle() {
  const { user, configured } = useAuth();
  const key = pushKey();
  const mounted = useMounted();
  const supported = mounted && pushSupported();
  const [enabled, setEnabled] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    void pushEnabled().then(setEnabled).catch(() => {});
  }, [supported]);

  if (!configured || !user || !supported || !key) return null;

  async function enable() {
    setNote(null);
    const result = await enablePush();
    setEnabled(result === "on");
    setNote(
      result === "on"
        ? "You’ll get a notification for new matches and messages."
        : result === "blocked"
          ? "Notifications are blocked in your browser settings."
          : "Could not turn on notifications.",
    );
  }

  async function disable() {
    await disablePush();
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
