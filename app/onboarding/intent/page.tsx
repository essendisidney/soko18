"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTENTS } from "@/lib/data/cities";
import { ONBOARDING } from "@/lib/onboarding";
import { Chip } from "@/components/soko/chip";
import { Button } from "@/components/soko/button";

export default function IntentOnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  function next() {
    localStorage.setItem(ONBOARDING.intent, selected.join(","));
    localStorage.setItem(ONBOARDING.done, "1");
    localStorage.setItem(ONBOARDING.city, "nairobi");
    router.push("/discover");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-6 pt-16 pb-10">
      <p className="text-[13px] tracking-[0.2em] text-gold uppercase">Nairobi</p>
      <h1 className="mt-4 font-display text-4xl tracking-tight">What are you looking for?</h1>
      <p className="mt-3 text-sm text-muted">Choose up to three.</p>
      <div className="mt-10 flex flex-wrap gap-2">
        {INTENTS.map((intent) => (
          <Chip
            key={intent.id}
            selected={selected.includes(intent.id)}
            onClick={() => toggle(intent.id)}
          >
            {intent.label}
          </Chip>
        ))}
      </div>
      <div className="mt-auto pt-10">
        <Button className="w-full" disabled={selected.length === 0} onClick={next}>
          Discover
        </Button>
      </div>
    </main>
  );
}
