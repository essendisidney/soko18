"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ONBOARDING } from "@/lib/onboarding";
import { IntentPicker } from "@/components/onboarding/intent-picker";
import { cityNameBySlug } from "@/lib/geo/kenya";
import { citySnapshot, subscribeNearArea } from "@/lib/nairobi/near";

export default function IntentOnboardingPage() {
  const router = useRouter();
  const citySlug = useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING.age) !== "1") router.replace("/");
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-6 pt-16 pb-10">
      <p className="text-[13px] tracking-[0.2em] text-gold uppercase">{cityNameBySlug(citySlug)}</p>
      <h1 className="mt-4 font-display text-4xl tracking-tight">What are you looking for?</h1>
      <p className="mt-3 text-sm text-muted">Pick one or two. You can change this any time.</p>
      <IntentPicker
        doneLabel="Continue"
        onDone={() => {
          router.push("/onboarding/privacy");
        }}
      />
    </main>
  );
}
