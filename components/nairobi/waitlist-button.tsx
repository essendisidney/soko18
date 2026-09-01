"use client";

import Link from "next/link";
import { Button } from "@/components/soko/button";
import { joinWaitlist, subscribeWaitlist, waitlistSnapshot } from "@/lib/browse/waitlist";
import { waitlistAreas } from "@/lib/data/waitlist";
import { writeNearArea } from "@/lib/nairobi/near";
import { ONBOARDING } from "@/lib/onboarding";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { SkipLineButton, skipIdleLabel } from "@/components/payments/skip-line-button";

export function WaitlistButton({ slug }: { slug: string }) {
  const listed = useLocalIds(subscribeWaitlist, waitlistSnapshot).includes(slug);

  return (
    <>
      <Button className="mt-4 w-full" variant="ghost" onClick={() => joinWaitlist(slug)}>
        {listed ? "You’re on the list" : "Notify me"}
      </Button>
      <SkipLineButton idleLabel={skipIdleLabel()} />
      <p className="mt-2 px-1 text-xs text-muted">
        Staff review next after STK. Never a fake queue count.
      </p>
    </>
  );
}

export function WaitlistDiscover({ slug }: { slug: string }) {
  return (
    <Link
      href="/discover"
      className="mt-8 block"
      onClick={() => {
        localStorage.setItem(ONBOARDING.city, slug);
        const area = waitlistAreas(slug)[0];
        if (area) writeNearArea(area.slug);
      }}
    >
      <Button variant="gold" className="w-full">
        Discover
      </Button>
    </Link>
  );
}
