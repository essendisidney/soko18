"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING } from "@/lib/onboarding";
import { Button } from "@/components/soko/button";
import { DiscretionTools } from "@/components/privacy/discretion-tools";
import { redeemFriendPass } from "@/lib/growth/referral";

export default function PrivacyOnboardingPage() {
  const router = useRouter();
  const [passNote, setPassNote] = useState<string | null>(null);

  useEffect(() => {
    const incoming = new URLSearchParams(window.location.search).get("pass");
    if (!incoming) return;
    const result = redeemFriendPass(incoming);
    if (result.ok) setPassNote("Friend pass saved. Staff see you first when you submit.");
  }, []);

  function finish() {
    localStorage.setItem(ONBOARDING.done, "1");
    localStorage.setItem(ONBOARDING.city, localStorage.getItem(ONBOARDING.city) || "nairobi");
    router.push("/discover");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-6 pt-16 pb-10">
      <p className="text-[13px] tracking-[0.2em] text-gold uppercase">Private</p>
      <h1 className="mt-4 font-display text-4xl tracking-tight">Stay unseen</h1>
      <p className="mt-3 text-sm text-muted">Hash contacts so people you know never see you here. Skip if you want Discover now.</p>
      {passNote ? <p className="mt-3 text-xs text-gold">{passNote}</p> : null}
      <DiscretionTools />
      <div className="mt-auto space-y-3 pt-10">
        <Button className="w-full" variant="gold" onClick={finish}>
          Discover
        </Button>
        <Button className="w-full" variant="ghost" onClick={finish}>
          Skip
        </Button>
      </div>
    </main>
  );
}
