"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { CHECK_IN_KEY, nairobiDay, streakLine, type CheckIn } from "@/lib/growth/streak";

/** Counts today's visit for the streak and shows a short note when there's something to say. */
export function DailyCheckIn() {
  const { user, ready, configured } = useAuth();
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !ready || !user) return;
    const today = nairobiDay();
    try {
      if (localStorage.getItem(CHECK_IN_KEY) === `${user.id}:${today}`) return;
      localStorage.setItem(CHECK_IN_KEY, `${user.id}:${today}`);
    } catch {}
    void fetch("/api/me/check-in", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: CheckIn | null } | null) => setLine(streakLine(json?.data ?? null)))
      .catch(() => {});
  }, [configured, ready, user]);

  // While the app is open and visible, tell the server every 5 minutes (feeds "active now").
  useEffect(() => {
    if (!configured || !ready || !user) return;
    const ping = () => {
      if (document.visibilityState === "visible") void fetch("/api/me/seen", { method: "POST" }).catch(() => {});
    };
    const id = window.setInterval(ping, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [configured, ready, user]);

  useEffect(() => {
    if (!line) return;
    const id = window.setTimeout(() => setLine(null), 6000);
    return () => window.clearTimeout(id);
  }, [line]);

  if (!line) return null;
  return (
    <button
      type="button"
      role="status"
      onClick={() => setLine(null)}
      className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-40 mx-auto max-w-sm rounded-2xl border border-gold/50 bg-bg-elevated/95 px-4 py-3 text-left text-sm text-cream shadow-lg backdrop-blur"
    >
      {line}
    </button>
  );
}
