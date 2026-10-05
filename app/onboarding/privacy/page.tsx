"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SnappedCityKicker, SnappedPlaceNote } from "@/components/city/city-door";
import { writeCity } from "@/lib/nairobi/near";
import { ONBOARDING } from "@/lib/onboarding";
import { Button } from "@/components/soko/button";
import { DiscretionTools } from "@/components/privacy/discretion-tools";
import { normalizePass, rememberInvite } from "@/lib/growth/referral";
import { useMounted } from "@/lib/use-mounted";

export default function PrivacyOnboardingPage() {
  const router = useRouter();
  const params = useMounted() ? new URLSearchParams(window.location.search) : null;
  const incoming = params?.get("invite") ?? params?.get("pass") ?? null;
  const passNote =
    incoming && normalizePass(incoming).length >= 4
      ? "Invite saved. Your welcome gift unlocks when your profile goes live."
      : null;

  useEffect(() => {
    if (incoming) rememberInvite(incoming);
  }, [incoming]);

  function finish() {
    localStorage.setItem(ONBOARDING.done, "1");
    writeCity(localStorage.getItem(ONBOARDING.city) || "nairobi");
    router.push("/discover");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-6 pt-16 pb-10">
      <SnappedCityKicker className="text-[13px] tracking-[0.2em] text-gold uppercase" />
      <h1 className="mt-4 font-display text-4xl tracking-tight">Stay unseen</h1>
      <p className="mt-3 text-sm text-muted">Hash contacts so people you know never see you here. Skip if you want Discover now.</p>
      <SnappedPlaceNote />
      {passNote ? <p className="mt-3 text-xs text-gold">{passNote}</p> : null}
      <DiscretionTools />
      <div className="mt-auto space-y-3 pt-10">
        <Button className="w-full" variant="gold" onClick={finish}>
          Discover
        </Button>
      </div>
    </main>
  );
}
