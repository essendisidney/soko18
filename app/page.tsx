"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ageGateMaxDate, isAdultBirthDate, MIN_BIRTH_DATE } from "@/lib/age";
import { locateHere } from "@/lib/geo/locate";
import { ONBOARDING, bumpVisit, confirmAge, markWelcomeSeen } from "@/lib/onboarding";
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
  const [dob, setDob] = useState("");
  const [locating, setLocating] = useState(false);
  const adult = isAdultBirthDate(dob);
  const underage = Boolean(dob) && !adult;

  useEffect(() => {
    if (mode === "age") return;
    bumpVisit();
    if (mode === "pulse") {
      markWelcomeSeen();
      return;
    }
    router.replace("/discover");
  }, [mode, router]);

  async function useMyArea() {
    if (!adult) return;
    confirmAge();
    setLocating(true);
    const result = await locateHere();
    setLocating(false);
    if (!result.ok) {
      localStorage.setItem(ONBOARDING.city, "nairobi");
    }
    router.push("/onboarding/intent");
  }

  function continueInNairobi() {
    if (!adult) return;
    confirmAge();
    localStorage.setItem(ONBOARDING.city, "nairobi");
    router.push("/onboarding/intent");
  }

  function otherCities() {
    if (!adult) return;
    confirmAge();
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
        <p className="mt-6 text-sm text-muted">Kenya. Men around you.</p>
      </div>
      <div className="relative z-10 w-full max-w-sm pb-4">
        <label className="block text-left" htmlFor="birthDate">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Date of birth</span>
          <input
            id="birthDate"
            type="date"
            name="birthDate"
            autoComplete="bday"
            min={MIN_BIRTH_DATE}
            max={ageGateMaxDate()}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm text-cream outline-none [color-scheme:dark]"
          />
        </label>
        <p className="mt-4 mb-5 text-center text-xs leading-relaxed text-muted">
          {underage
            ? "SOKO18 is 18+. You cannot continue."
            : "You must be 18 or older to continue. SOKO18 is a private discovery product for adults. "}
          {underage ? null : (
            <>
              <Link href="/terms" className="text-cream/70">
                Terms
              </Link>
              {" · "}
              <Link href="/privacy" className="text-cream/70">
                Privacy
              </Link>
            </>
          )}
        </p>
        <Button className="w-full" variant="gold" disabled={!adult || locating} onClick={() => void useMyArea()}>
          {locating ? "Finding your area…" : "Use my area"}
        </Button>
        <Button className="mt-3 w-full" variant="ghost" disabled={!adult} onClick={continueInNairobi}>
          Continue in Nairobi
        </Button>
        <button
          type="button"
          disabled={!adult}
          onClick={otherCities}
          className="mt-4 w-full text-sm text-muted disabled:opacity-40 disabled:pointer-events-none"
        >
          Other cities in Kenya
        </button>
      </div>
    </main>
  );
}
