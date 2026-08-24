"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import type { SeedProfile } from "@/lib/types";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";

export function MatchOverlay({
  profile,
  onClose,
}: {
  profile: SeedProfile;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Wordmark size="sm" />
      <p className="mt-10 font-display text-[13px] tracking-[0.28em] text-gold">IT’S A MATCH</p>
      <p className="mt-4 font-display text-4xl tracking-tight">You + {profile.name}</p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <span className="text-gold">✦</span>
        <div className="relative size-24 overflow-hidden rounded-full border border-line">
          <Image src={profile.photos[0]} alt="" fill className="object-cover" />
        </div>
        <span className="text-gold">✦</span>
      </div>
      <p className="mt-8 text-sm text-muted">You both liked each other.</p>
      <Link href={`/messages/${profile.slug}`} className="mt-10 w-full max-w-xs">
        <Button className="w-full" variant="gold">
          Say Hello
        </Button>
      </Link>
      <button type="button" onClick={onClose} className="mt-5 text-sm text-muted">
        Not now
      </button>
    </motion.div>
  );
}
