"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { welcomeBackStats } from "@/lib/nairobi/live";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";

export function WelcomeBack({ onDone }: { onDone: () => void }) {
  const stats = welcomeBackStats();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/96 px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Wordmark size="sm" />
      <p className="mt-10 font-display text-[13px] tracking-[0.28em] text-gold">WELCOME BACK</p>
      <ul className="mt-8 space-y-3 text-lg text-cream/90">
        <li>{stats.newProfiles} new profiles</li>
        <li>{stats.newlyVerified} newly verified</li>
        <li>{stats.recentlyActive} recently active</li>
        <li>{stats.newMatches} new matches</li>
      </ul>
      <Link href="/nairobi" className="mt-12 w-full max-w-xs" onClick={onDone}>
        <Button className="w-full" variant="gold">
          See Nairobi
        </Button>
      </Link>
      <button type="button" onClick={onDone} className="mt-5 text-sm text-muted">
        Continue discovering
      </button>
    </motion.div>
  );
}
