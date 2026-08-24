"use client";

import { useRouter } from "next/navigation";
import { ONBOARDING } from "@/lib/onboarding";
import { nairobiAliveLine, nairobiPlaceLine } from "@/lib/nairobi/live";
import { Button } from "@/components/soko/button";

export default function ReadyPage() {
  const router = useRouter();
  const alive = nairobiAliveLine();
  const place = nairobiPlaceLine();

  function start() {
    localStorage.setItem(ONBOARDING.done, "1");
    localStorage.setItem(ONBOARDING.city, "nairobi");
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
