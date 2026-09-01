"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/soko/button";
import { DEFAULT_NEAR_AREA, nearAreaSnapshot } from "@/lib/nairobi/near";
import { ONBOARDING } from "@/lib/onboarding";
import { checkIn, hereLine, hereSnapshot, presenceFrom, readHere, subscribeHere } from "@/lib/presence/here";

export function HereNowButton({
  areaSlug,
  citySlug,
  compact = false,
}: {
  areaSlug?: string;
  citySlug?: string;
  compact?: boolean;
}) {
  const raw = useSyncExternalStore(subscribeHere, hereSnapshot, () => null);
  const ping = raw ? readHere() : null;
  const active = ping ? presenceFrom(ping.at) === "active" : false;

  function pingHere() {
    const area = areaSlug ?? nearAreaSnapshot() ?? DEFAULT_NEAR_AREA;
    const city = citySlug ?? localStorage.getItem(ONBOARDING.city) ?? "nairobi";
    checkIn(area, city);
  }

  if (compact) {
    return (
      <button type="button" className="mt-2 px-1 text-left text-xs text-muted" onClick={pingHere}>
        {active && ping ? hereLine(ping) : "I’m here · area only"}
      </button>
    );
  }

  return (
    <div className="mt-4">
      {ping ? <p className="mb-3 text-xs text-gold">{hereLine(ping)}</p> : null}
      <Button className="w-full" variant={active ? "gold" : "ghost"} onClick={pingHere}>
        I’m here
      </Button>
    </div>
  );
}
