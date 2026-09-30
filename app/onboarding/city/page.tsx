"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { joinWaitlist } from "@/lib/browse/waitlist";
import { waitlistAreas } from "@/lib/data/waitlist";
import { locateHere } from "@/lib/geo/locate";
import { cityNameBySlug, cityOnboardingNext, cityOnboardingPrimary, kenyaDoorCities } from "@/lib/geo/kenya";
import { cityPlaceLine } from "@/lib/nairobi/live";
import { citySnapshot, subscribeNearArea, writeCity, writeNearArea } from "@/lib/nairobi/near";
import { ONBOARDING } from "@/lib/onboarding";
import { Button } from "@/components/soko/button";

function subscribe() {
  return () => {};
}

function onboarded() {
  return localStorage.getItem(ONBOARDING.done) === "1";
}

export default function CityOnboardingPage() {
  const router = useRouter();
  const done = useSyncExternalStore(subscribe, onboarded, () => false);
  const citySlug = useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");
  const kenya = kenyaDoorCities(citySlug);
  const cityName = cityNameBySlug(citySlug);

  useEffect(() => {
    const aged = localStorage.getItem(ONBOARDING.age) === "1";
    const finished = localStorage.getItem(ONBOARDING.done) === "1";
    if (!aged && !finished) router.replace("/");
  }, [router]);

  function stayOrNairobi() {
    if (!done) {
      writeCity("nairobi");
      router.push("/onboarding/intent");
      return;
    }
    writeCity(citySlug);
    router.push("/discover");
  }

  async function useMyArea() {
    const result = await locateHere();
    if (!result.ok) writeCity("nairobi");
    router.push(done ? "/discover" : "/onboarding/intent");
  }

  function openCity(slug: string) {
    writeCity(slug);
    const area = waitlistAreas(slug)[0];
    if (area) writeNearArea(area.slug);
    if (slug !== "nairobi") joinWaitlist(slug);
    router.push(cityOnboardingNext(done, slug));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-6 pt-16 pb-10">
      <p className="text-[13px] tracking-[0.2em] text-gold uppercase">{done ? cityName : "Kenya"}</p>
      <h1 className="mt-4 font-display text-4xl tracking-tight">SOKO18 is live in Kenya.</h1>
      <p className="mt-3 text-sm text-muted">
        Use my area finds men around you. Area-level only. Never a precise location.
      </p>
      <p className="mt-1 text-sm text-muted">Empty stays empty. Never a borrowed catalog.</p>
      <Button className="mt-10 w-full" variant="gold" onClick={() => void useMyArea()}>
        Use my area
      </Button>
      <Button className="mt-3 w-full" variant="ghost" onClick={stayOrNairobi}>
        {cityOnboardingPrimary(done, citySlug)}
      </Button>
      <div className="mt-12">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Kenya</p>
        <div className="mt-3 flex flex-col gap-2">
          {kenya.map((city) => (
            <button
              key={city.slug}
              type="button"
              aria-label={city.name}
              onClick={() => openCity(city.slug)}
              className="flex items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left text-[15px] text-cream/70"
            >
              <span>
                <span className="block text-cream/90">{city.name}</span>
                <span className="mt-1 block text-xs text-muted">{cityPlaceLine(city.slug)}</span>
              </span>
              <span className="text-xs text-muted">{city.slug === "nairobi" ? "Live" : "Open"}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
