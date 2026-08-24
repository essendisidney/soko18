"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/soko/button";
import { joinWaitlist, onWaitlist, WAITLIST_EVENT } from "@/lib/browse/waitlist";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(WAITLIST_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(WAITLIST_EVENT, onChange);
  };
}

export function WaitlistButton({ slug }: { slug: string }) {
  const listed = useSyncExternalStore(
    subscribe,
    () => onWaitlist(slug),
    () => false,
  );

  return (
    <Button
      className="mt-8 w-full"
      variant={listed ? "ghost" : "gold"}
      onClick={() => joinWaitlist(slug)}
    >
      {listed ? "You’re on the list" : "Notify me"}
    </Button>
  );
}
