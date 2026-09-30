"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ONBOARDING } from "@/lib/onboarding";
import { cityAliveLine, cityWelcomePlaces } from "@/lib/nairobi/live";
import { citySnapshot, subscribeNearArea, writeCity } from "@/lib/nairobi/near";
import { Button } from "@/components/soko/button";

export default function ReadyPage() {
  const router = useRouter();
  const citySlug = useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");
  const alive = cityAliveLine(citySlug);
  const place = cityWelcomePlaces(citySlug, 3).join(" · ");

  function start() {
    localStorage.setItem(ONBOARDING.done, "1");
    writeCity(citySlug);
    router.push("/discover");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-bg px-6 text-center">
      <p className="font-display text-5xl tracking-tight">You’re ready.</p>
      <p className="mt-4 text-muted">{alive}</p>
      <p className="mt-2 text-sm text-muted">{place}</p>
      <Button className="mt-12 w-full max-w-xs" variant="gold" onClick={start}>
        Discover
      </Button>
    </main>
  );
}
