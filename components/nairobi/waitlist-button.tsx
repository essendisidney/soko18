"use client";

import Link from "next/link";
import { Button } from "@/components/soko/button";
import { joinWaitlist, subscribeWaitlist, waitlistSnapshot } from "@/lib/browse/waitlist";
import { waitlistAreas } from "@/lib/data/waitlist";
import { writeCity, writeNearArea } from "@/lib/nairobi/near";
import { useLocalIds } from "@/lib/safety/use-id-list";

export function WaitlistButton({ slug }: { slug: string }) {
  const listed = useLocalIds(subscribeWaitlist, waitlistSnapshot).includes(slug);

  return (
    <>
      <Button className="mt-4 w-full" variant="ghost" onClick={() => joinWaitlist(slug)}>
        {listed ? "You’re on the list" : "Notify me"}
      </Button>
      <p className="mt-2 px-1 text-xs text-muted">
        Staff review next after STK. Never a fake queue count.
      </p>
    </>
  );
}

export function WaitlistDiscover({ slug, areaSlug }: { slug: string; areaSlug?: string }) {
  return (
    <Link
      href="/discover"
      className="mt-8 block"
      onClick={() => {
        writeCity(slug);
        const area = areaSlug ?? waitlistAreas(slug)[0]?.slug;
        if (area) writeNearArea(area);
      }}
    >
      <Button variant="gold" className="w-full">
        Discover
      </Button>
    </Link>
  );
}

export function CityNotifyButton({ slug }: { slug: string }) {
  const listed = useLocalIds(subscribeWaitlist, waitlistSnapshot).includes(slug);

  return (
    <Button className="w-full" variant={listed ? "ghost" : "gold"} onClick={() => joinWaitlist(slug)}>
      {listed ? "You’re on the list" : "Notify me"}
    </Button>
  );
}
