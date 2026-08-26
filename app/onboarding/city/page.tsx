"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { joinWaitlist } from "@/lib/browse/waitlist";
import { WAITLIST_CITIES } from "@/lib/data/nairobi";
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

  function continueNairobi() {
    localStorage.setItem(ONBOARDING.city, "nairobi");
    router.push(done ? "/discover" : "/onboarding/intent");
  }

  function waitlist(slug: string) {
    joinWaitlist(slug);
    router.push(`/city/${slug}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-6 pt-16 pb-10">
      <p className="text-[13px] tracking-[0.2em] text-gold uppercase">Nairobi</p>
      <h1 className="mt-4 font-display text-4xl tracking-tight">SOKO18 is live in Nairobi.</h1>
      <p className="mt-3 text-sm text-muted">
        Density first. Other cities open when Nairobi is strong.
      </p>
      <Button className="mt-10 w-full" variant="gold" onClick={continueNairobi}>
        {done ? "Discover Nairobi" : "Continue in Nairobi"}
      </Button>
      <div className="mt-12">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Coming later</p>
        <div className="mt-3 flex flex-col gap-2">
          {WAITLIST_CITIES.map((city) => (
            <button
              key={city.slug}
              type="button"
              onClick={() => waitlist(city.slug)}
              className="flex items-center justify-between rounded-2xl border border-line bg-glass px-5 py-4 text-left text-[15px] text-cream/70"
            >
              {city.name}
              <span className="text-xs text-muted">Notify me</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
