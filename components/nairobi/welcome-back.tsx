"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import {
  cityAliveLine,
  cityWelcomePlaces,
  nairobiGreeting,
  nairobiInventoryLine,
  welcomeBackStats,
} from "@/lib/nairobi/live";
import { cityHomeHref, cityNameBySlug } from "@/lib/geo/kenya";
import { writeCityCookie } from "@/lib/geo/city-cookie";
import { citySnapshot, subscribeNearArea } from "@/lib/nairobi/near";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";

export function WelcomeBack({ onDone }: { onDone: () => void }) {
  const citySlug = useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");
  const stats = welcomeBackStats();
  const greeting = nairobiGreeting();
  const alive = cityAliveLine(citySlug);
  const inventory = citySlug === "nairobi" ? nairobiInventoryLine() : null;
  const places = cityWelcomePlaces(citySlug);
  const cityName = cityNameBySlug(citySlug);

  return (
    <motion.div
      className="flex min-h-dvh flex-col items-center bg-bg/96 px-8 py-[max(2.5rem,env(safe-area-inset-top))] text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center">
        <Wordmark size="sm" />
        <p className="mt-10 font-display text-[13px] tracking-[0.28em] text-gold">SOKO18</p>
        <h1 className="mt-4 font-display text-4xl tracking-tight">{greeting}</h1>
        <p className="mt-3 text-sm text-muted">{alive}</p>
        {inventory ? (
          <ul className="mt-8 space-y-3 text-lg text-cream/90">
            <li>{stats.newProfiles} new profiles</li>
            <li>{stats.recentlyActive} recently active</li>
            <li>{stats.newlyVerified} newly verified</li>
            {stats.newMatches > 0 ? <li>{stats.newMatches} new matches</li> : null}
          </ul>
        ) : (
          <ul className="mt-8 space-y-3 text-lg text-cream/90">
            {places.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
        <Button
          className="mt-12 w-full max-w-xs"
          variant="gold"
          onClick={() => {
            writeCityCookie(citySlug);
            onDone();
          }}
        >
          Discover
        </Button>
        <Link
          href={cityHomeHref(citySlug)}
          className="mt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-sm text-muted"
          onClick={() => {
            writeCityCookie(citySlug);
            onDone();
          }}
        >
          Browse {cityName}
        </Link>
      </div>
    </motion.div>
  );
}
