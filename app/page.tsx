"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ONBOARDING } from "@/lib/onboarding";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { WelcomeBack } from "@/components/nairobi/welcome-back";

function subscribe() {
  return () => {};
}

export default function WelcomePage() {
  const router = useRouter();
  const returning = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(ONBOARDING.done) === "1",
    () => false,
  );

  function continueAsAdult() {
    localStorage.setItem(ONBOARDING.age, "1");
    router.push("/onboarding/city");
  }

  if (returning) {
    return <WelcomeBack onDone={() => router.push("/discover")} />;
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-bg px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(212,181,106,0.12),transparent_55%)]" />
      <div />
      <div className="relative z-10 flex flex-col items-center text-center">
        <Wordmark size="lg" />
        <p className="mt-8 font-display text-2xl leading-snug tracking-tight text-cream/90">
          Discover.
          <br />
          Connect.
          <br />
          Verify.
        </p>
        <p className="mt-6 text-sm text-muted">Nairobi</p>
      </div>
      <div className="relative z-10 w-full max-w-sm pb-4">
        <p className="mb-5 text-center text-xs leading-relaxed text-muted">
          You must be 18 or older to continue. SOKO18 is a private discovery product for adults.{" "}
          <Link href="/terms" className="text-cream/70">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="text-cream/70">
            Privacy
          </Link>
        </p>
        <Button className="w-full" onClick={continueAsAdult}>
          Continue
        </Button>
      </div>
    </main>
  );
}
