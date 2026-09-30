"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/soko/button";

type Launch = { live: number; target: number };

/** "32 of 50 people live in Westlands" — turns an empty feed into a reason to invite. */
export function LaunchMeter({ city, area, place }: { city: string; area?: string | null; place: string }) {
  const [launch, setLaunch] = useState<Launch | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ city });
    if (area) params.set("area", area);
    let alive = true;
    fetch(`/api/launch?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (alive) setLaunch(json?.data ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [city, area]);

  if (!launch || launch.live >= launch.target) return null;
  const pct = Math.max(4, Math.round((launch.live / launch.target) * 100));

  return (
    <div className="w-full max-w-xs rounded-3xl border border-gold/40 p-4 text-left">
      <p className="text-[11px] tracking-[0.18em] text-gold uppercase">Launching in {place}</p>
      <p className="mt-2 text-sm">
        <span className="font-display text-xl">{launch.live}</span>
        <span className="text-muted"> of {launch.target} people live</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">Each friend you bring earns you 7 days of Gold.</p>
      <Link href="/invite" className="mt-3 block">
        <Button className="w-full" variant="gold" size="md">
          Invite friends
        </Button>
      </Link>
    </div>
  );
}
