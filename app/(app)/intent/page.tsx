"use client";

import { useRouter } from "next/navigation";
import { IntentPicker } from "@/components/onboarding/intent-picker";

export default function IntentPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="text-[13px] tracking-[0.2em] text-gold uppercase">Nairobi</p>
      <h1 className="mt-4 font-display text-4xl tracking-tight">What are you looking for?</h1>
      <p className="mt-3 text-sm text-muted">Choose up to three.</p>
      <IntentPicker onDone={() => router.push("/discover")} />
    </div>
  );
}
