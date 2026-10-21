"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { enablePush, markAsked, pushEnabled, pushSupported, readAsks, shouldAsk } from "@/lib/push/client";

const COPY: Record<string, { title: string; body: string }> = {
  match: { title: "Know when they reply", body: "Get a notification for new messages. Your lock screen never shows names." },
  likes: { title: "Know when someone likes you", body: "Get a notification the moment it happens. Names never show on your lock screen." },
  live: { title: "Don’t miss your first like", body: "Turn on notifications for likes, matches and messages. Names never show on your lock screen." },
};

/** Ask for notifications at the moment they matter. Once per reason; "Not now" waits a week. */
export function PushAsk({ reason, className = "" }: { reason: keyof typeof COPY; className?: string }) {
  const { user, configured } = useAuth();
  const [show, setShow] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !user || !pushSupported()) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
    if (!shouldAsk(reason, readAsks())) return;
    let alive = true;
    void pushEnabled()
      .then((on) => {
        if (alive && !on) setShow(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [configured, user, reason]);

  if (!show) return null;
  const copy = COPY[reason];

  return (
    <div className={`rounded-2xl border border-gold/40 bg-gold/[0.06] p-4 text-left ${className}`}>
      <p className="flex items-center gap-2 text-sm font-medium">
        <BellRing className="size-4 text-gold" aria-hidden />
        {copy.title}
      </p>
      <p className="mt-1 text-xs text-muted">{copy.body}</p>
      {note ? (
        <p className="mt-2 text-xs text-cream/85">{note}</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="h-9 flex-1 rounded-full bg-gold text-sm font-medium text-bg"
            onClick={async () => {
              markAsked(reason);
              const result = await enablePush();
              setNote(
                result === "on"
                  ? "Done. We’ll let you know."
                  : result === "blocked"
                    ? "Your browser blocked it. You can allow it in your browser settings."
                    : "That didn’t work. Try again from Settings.",
              );
              if (result === "on") window.setTimeout(() => setShow(false), 2500);
            }}
          >
            Turn on
          </button>
          <button
            type="button"
            className="h-9 rounded-full px-4 text-sm text-muted"
            onClick={() => {
              markAsked(reason);
              setShow(false);
            }}
          >
            Not now
          </button>
        </div>
      )}
    </div>
  );
}
