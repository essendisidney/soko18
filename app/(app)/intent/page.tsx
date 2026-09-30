"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { IntentPicker } from "@/components/onboarding/intent-picker";
import { cityNameBySlug } from "@/lib/geo/kenya";
import { cityPlaceLine } from "@/lib/nairobi/live";
import { citySnapshot, nearAreaSnapshot, subscribeNearArea } from "@/lib/nairobi/near";

export default function IntentPage() {
  const router = useRouter();
  const citySlug = useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");
  const near = useSyncExternalStore(subscribeNearArea, nearAreaSnapshot, () => null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="text-[13px] tracking-[0.2em] text-gold uppercase">{cityNameBySlug(citySlug)}</p>
      <h1 className="mt-4 font-display text-4xl tracking-tight">What are you looking for?</h1>
      <p className="mt-3 text-sm text-muted">Choose up to three.</p>
      <p className="mt-1 text-sm text-muted">{cityPlaceLine(citySlug, near)}</p>
      <IntentPicker onDone={() => router.push("/discover")} />
    </div>
  );
}
