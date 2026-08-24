"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { coverPhoto } from "@/lib/media/public";
import type { SeedProfile } from "@/lib/types";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";

export function MatchOverlay({
  profile,
  onClose,
  onMessage,
}: {
  profile: SeedProfile;
  onClose: () => void;
  onMessage?: () => boolean;
}) {
  const cover = coverPhoto(profile);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <span className="pointer-events-none absolute top-24 left-1/3 size-1.5 rounded-full bg-gold/70" />
      <span className="pointer-events-none absolute top-40 right-1/4 size-1 rounded-full bg-gold/40" />
      <span className="pointer-events-none absolute bottom-32 left-1/4 size-1 rounded-full bg-gold/50" />
      <Wordmark size="sm" />
      <p className="mt-10 font-display text-[13px] tracking-[0.28em] text-gold">IT’S A MATCH</p>
      <p className="mt-4 font-display text-4xl tracking-tight">You + {profile.name}</p>
      <div className="relative mt-8 h-24 w-40">
        <div className="absolute top-0 left-0 size-24 rounded-full border border-gold/50 bg-gold/15" />
        {cover ? (
          <div className="absolute top-0 left-16 size-24">
            <div className="relative size-full overflow-hidden rounded-full border border-line">
              <Image src={cover} alt="" fill sizes="96px" className="object-cover" />
            </div>
          </div>
        ) : null}
      </div>
      <p className="mt-8 text-sm text-muted">You both liked each other.</p>
      <Link
        href={`/messages/${profile.slug}`}
        className="mt-10 w-full max-w-xs"
        onClick={(event) => {
          if (onMessage?.() === false) event.preventDefault();
        }}
      >
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
