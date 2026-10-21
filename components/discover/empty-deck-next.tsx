"use client";

import Link from "next/link";
import { CalendarPlus, Gift, Moon } from "lucide-react";
import { liveNight } from "@/lib/live-night";
import { useMounted } from "@/lib/use-mounted";

/** Out of people: two real things to do next, instead of a dead end. */
export function EmptyDeckNext() {
  const mounted = useMounted();
  if (!mounted) return null;
  const night = liveNight();
  const when = night.live
    ? "on now, until 10pm"
    : night.start.toLocaleDateString("en-KE", { weekday: "long", timeZone: "Africa/Nairobi" }) + " 8pm";

  return (
    <div className="mt-5 w-full space-y-2 text-left">
      <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
        <Moon className="size-4 shrink-0 text-gold" aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          Live swipe night <span className="text-muted">· {when}</span>
        </p>
        {!night.live ? (
          <a href="/api/live-night/ics" download className="inline-flex items-center gap-1 text-xs text-gold">
            <CalendarPlus className="size-3.5" aria-hidden /> Remind me
          </a>
        ) : null}
      </div>
      <Link href="/invite" className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
        <Gift className="size-4 shrink-0 text-gold" aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          Bring a friend <span className="text-muted">· 7 days of Gold when they go live</span>
        </p>
      </Link>
    </div>
  );
}
