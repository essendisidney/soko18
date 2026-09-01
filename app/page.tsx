"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ONBOARDING, bumpVisit, markWelcomeSeen } from "@/lib/onboarding";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { WelcomeBack } from "@/components/nairobi/welcome-back";

function subscribe() {
  return () => {};
}

function openMode() {
  if (localStorage.getItem(ONBOARDING.done) !== "1") return "age";
  if (sessionStorage.getItem(ONBOARDING.welcomeSeen) !== "1") return "pulse";
  return "go";
}

export default function WelcomePage() {
  const router = useRouter();
  const mode = useSyncExternalStore(subscribe, openMode, () => "age");

  useEffect(() => {
    if (mode === "age") return;
    bumpVisit();
    if (mode === "pulse") {
      markWelcomeSeen();
      return;
    }
    router.replace("/discover");
  }, [mode, router]);

  function continueInNairobi() {
    localStorage.setItem(ONBOARDING.age, "1");
    localStorage.setItem(ONBOARDING.city, "nairobi");
    router.push("/onboarding/intent");
  }

  function otherCities() {
    localStorage.setItem(ONBOARDING.age, "1");
    router.push("/onboarding/city");
  }

  if (mode === "pulse") {
    return <WelcomeBack onDone={() => router.push("/discover")} />;
  }

  if (mode === "go") {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <Wordmark size="sm" />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh touch-pan-y flex-col items-center justify-between bg-bg px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
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
        <Button className="w-full" variant="gold" onClick={continueInNairobi}>
          Continue in Nairobi
        </Button>
        <button type="button" onClick={otherCities} className="mt-4 w-full text-sm text-muted">
          Other cities
        </button>
      </div>
    </main>
  );
}
