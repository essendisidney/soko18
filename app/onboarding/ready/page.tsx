"use client";

import { useRouter } from "next/navigation";
import { ONBOARDING } from "@/lib/onboarding";
import { Button } from "@/components/soko/button";

export default function ReadyPage() {
  const router = useRouter();

  function start() {
    localStorage.setItem(ONBOARDING.done, "1");
    localStorage.setItem(ONBOARDING.city, "nairobi");
    router.push("/discover");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-bg px-6 text-center">
      <p className="font-display text-5xl tracking-tight">You’re ready.</p>
      <p className="mt-4 text-muted">Let’s discover Nairobi.</p>
      <Button className="mt-12 w-full max-w-xs" variant="gold" onClick={start}>
        Start
      </Button>
    </main>
  );
}
