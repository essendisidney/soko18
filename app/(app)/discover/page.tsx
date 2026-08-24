"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { rankProfiles } from "@/lib/discovery/rank";
import { nairobiProfiles } from "@/lib/data/seed";
import { AppHeader } from "@/components/nav/app-header";
import { SwipeDeck } from "@/components/discover/swipe-deck";
import { MatchOverlay } from "@/components/discover/match-overlay";
import type { SeedProfile } from "@/lib/types";

export default function DiscoverPage() {
  const [match, setMatch] = useState<SeedProfile | null>(null);

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <AppHeader title="Discover" subtitle="Nairobi · people you’ll like" />
      <div className="mt-5 min-h-0 flex-1">
        <SwipeDeck
          profiles={rankProfiles({ profiles: nairobiProfiles(), citySlug: "nairobi" })}
          onLike={(profile) => {
            if (profile.slug === "amani-nairobi") setMatch(profile);
          }}
        />
      </div>
      <AnimatePresence>
        {match ? <MatchOverlay profile={match} onClose={() => setMatch(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
