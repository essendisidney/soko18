"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarPlus, Moon, Zap } from "lucide-react";
import { countdown, liveNight } from "@/lib/live-night";
import { useMounted } from "@/lib/use-mounted";

const DAY = 24 * 60 * 60 * 1000;

/** Discover's strip for the weekly live swipe night: a countdown before, LIVE during. */
export function LiveNightBanner() {
  const mounted = useMounted();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  // Times depend on the viewer's clock, so render only on the client.
  if (!mounted) return null;

  const night = liveNight(new Date(now));

  if (night.live) {
    return (
      <div
        role="status"
        className="mx-1 mt-2 flex items-center gap-2.5 rounded-2xl bg-linear-to-r from-gold/25 via-gold/10 to-transparent px-3 py-2 ring-1 ring-gold/40"
      >
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px]">
          <span className="font-bold tracking-wide text-gold">LIVE</span>
          <span className="text-cream"> · Swipe night is on</span>
        </p>
        <span className="shrink-0 text-[11px] text-cream/70">ends in {countdown(night.end.getTime() - now)}</span>
        {/* Live night is the busy hour by design, so this is when a Boost does the most. */}
        <Link
          href="/upgrade#boost"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-400/15 px-2.5 py-1 text-[11px] text-violet-200 active:bg-violet-400/25"
          aria-label="Boost now during live night"
        >
          <Zap className="size-3 fill-violet-300 text-violet-300" aria-hidden />
          Boost
        </Link>
      </div>
    );
  }

  const until = night.start.getTime() - now;
  const when =
    until < DAY
      ? `starts in ${countdown(until)}`
      : `${night.start.toLocaleDateString("en-KE", { weekday: "short", timeZone: "Africa/Nairobi" })} 8pm`;

  return (
    <div className="mx-1 mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-1.5 pr-1.5 pl-3">
      <Moon className="size-3.5 shrink-0 text-gold" aria-hidden />
      <p className="min-w-0 flex-1 truncate text-[12px] text-cream/85">
        Live swipe night · <span className="text-gold">{when}</span>
      </p>
      <a
        href="/api/live-night/ics"
        download
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-cream/80 active:bg-white/10"
        aria-label="Add live swipe night to my calendar"
      >
        <CalendarPlus className="size-3.5" aria-hidden />
        Remind me
      </a>
    </div>
  );
}
