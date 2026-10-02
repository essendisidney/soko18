"use client";

import { useT } from "@/lib/i18n/use-t";
import { LanguagePicker } from "@/components/i18n/language-picker";
import { MarketBanner } from "@/components/markets/market-banner";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ageGateMaxDate, isAdultBirthDate, MIN_BIRTH_DATE } from "@/lib/age";
import { locateHere } from "@/lib/geo/locate";
import { guessedCity, writeCity } from "@/lib/nairobi/near";
import { cityNameBySlug } from "@/lib/geo/kenya";
import { ONBOARDING, bumpVisit, confirmAge, markWelcomeSeen, welcomeSeenToday } from "@/lib/onboarding";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { WelcomeBack } from "@/components/nairobi/welcome-back";

function subscribe() {
  return () => {};
}

function openMode() {
  if (localStorage.getItem(ONBOARDING.done) !== "1") return "age";
  if (!welcomeSeenToday()) return "pulse";
  return "go";
}

export default function WelcomePage() {
  const router = useRouter();
  const t = useT();
  const mode = useSyncExternalStore(subscribe, openMode, () => "age");
  const [dob, setDob] = useState("");
  const [locating, setLocating] = useState(false);
  const adult = isAdultBirthDate(dob);
  const homeCity = useSyncExternalStore(subscribe, guessedCity, () => "nairobi");
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
    confirmAge(dob);
    setLocating(true);
    const result = await locateHere();
    setLocating(false);
    if (!result.ok) writeCity(guessedCity());
    router.push("/onboarding/intent");
  }

  function continueInNairobi() {
    if (!adult) return;
    confirmAge(dob);
    writeCity(homeCity);
    router.push("/onboarding/intent");
  }

  function otherCities() {
    if (!adult) return;
    confirmAge(dob);
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
        <p className="mt-8 max-w-xs font-display text-[28px] leading-tight tracking-tight text-cream">{t("welcome.tagline")}</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-cream/80">
          <li className="rounded-full border border-line px-3 py-1.5">✓ Selfie-verified</li>
          <li className="rounded-full border border-line px-3 py-1.5">✓ Private by default</li>
          <li className="rounded-full border border-line px-3 py-1.5">✓ Pay with M-Pesa</li>
        </ul>
        <LanguagePicker compact />
        <MarketBanner />
      </div>
      <div className="relative z-10 w-full max-w-sm pb-4">
        <label className="block text-left" htmlFor="birthDate">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">{t("welcome.dob")}</span>
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
            ? t("welcome.underage")
            : `${t("welcome.adults")} `}
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
          {locating ? t("welcome.finding") : t("welcome.useArea")}
        </Button>
        <Button className="mt-3 w-full" variant="ghost" disabled={!adult} onClick={continueInNairobi}>
          {t("welcome.continueNairobi").replace("{city}", cityNameBySlug(homeCity))}
        </Button>
        <button
          type="button"
          disabled={!adult}
          onClick={otherCities}
          className="mt-4 w-full text-sm text-muted disabled:opacity-40 disabled:pointer-events-none"
        >
          {t("welcome.otherCities")}
        </button>
      </div>
    </main>
  );
}
