"use client";

import { Button } from "@/components/soko/button";
import { joinWaitlist, subscribeWaitlist, waitlistSnapshot } from "@/lib/browse/waitlist";
import { useLocalIds } from "@/lib/safety/use-id-list";

export function WaitlistButton({ slug }: { slug: string }) {
  const listed = useLocalIds(subscribeWaitlist, waitlistSnapshot).includes(slug);

  return (
    <Button className="mt-8 w-full" variant={listed ? "ghost" : "gold"} onClick={() => joinWaitlist(slug)}>
      {listed ? "You’re on the list" : "Notify me"}
    </Button>
  );
}
