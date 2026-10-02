"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { coverPhoto } from "@/lib/media/public";
import type { SeedProfile } from "@/lib/types";
import { Button } from "@/components/soko/button";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { useProfileMeta } from "@/lib/profile/sync";

const HEARTS = [
  { left: "12%", delay: 0, size: 18 },
  { left: "28%", delay: 0.35, size: 12 },
  { left: "48%", delay: 0.15, size: 22 },
  { left: "66%", delay: 0.5, size: 14 },
  { left: "84%", delay: 0.25, size: 18 },
];

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
  const me = useDraftProfile();
  const myPhoto = useProfileMeta()?.coverUrl ?? null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-bg/95 px-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {HEARTS.map((heart) => (
        <motion.span
          key={heart.left}
          className="pointer-events-none absolute bottom-0"
          style={{ left: heart.left }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: -700, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3.2, delay: heart.delay, repeat: Infinity, repeatDelay: 0.8, ease: "easeOut" }}
        >
          <Heart className="fill-gold/70 text-gold/70" style={{ width: heart.size, height: heart.size }} />
        </motion.span>
      ))}

      <motion.p
        className="font-display text-[13px] tracking-[0.28em] text-gold"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        IT’S A MATCH
      </motion.p>
      <motion.p
        className="mt-3 font-display text-4xl tracking-tight"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
      >
        You + {profile.name}
      </motion.p>

      <div className="relative mt-9 h-28 w-48">
        <motion.div
          className="absolute top-0 left-0 grid size-28 place-items-center overflow-hidden rounded-full border-2 border-gold bg-bg-elevated font-display text-4xl text-gold"
          initial={{ x: -60, rotate: -12, opacity: 0 }}
          animate={{ x: 0, rotate: -6, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.25 }}
        >
          {myPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={myPhoto} alt="You" className="h-full w-full object-cover" />
          ) : (
            (me?.displayName || "You").slice(0, 1).toUpperCase()
          )}
        </motion.div>
        <motion.div
          className="absolute top-0 right-0 size-28"
          initial={{ x: 60, rotate: 12, opacity: 0 }}
          animate={{ x: 0, rotate: 6, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.25 }}
        >
          <div className="relative size-full overflow-hidden rounded-full border-2 border-gold bg-bg-elevated">
            {cover ? (
              <Image src={cover} alt="" fill sizes="112px" className="object-cover" unoptimized={cover.startsWith("http")} />
            ) : (
              <span className="grid h-full place-items-center font-display text-4xl text-gold">{profile.name.slice(0, 1)}</span>
            )}
          </div>
        </motion.div>
        <motion.span
          className="absolute top-[38px] left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-gold shadow-[0_6px_24px_rgba(212,181,106,0.5)]"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.55, duration: 0.45 }}
        >
          <Heart className="size-4 fill-bg text-bg" />
        </motion.span>
      </div>

      <p className="mt-8 text-sm text-muted">You both liked each other. Don’t keep {profile.name} waiting.</p>
      <Link
        href={`/messages/${profile.slug}`}
        className="mt-8 w-full max-w-xs"
        onClick={(event) => {
          if (onMessage?.() === false) event.preventDefault();
        }}
      >
        <Button className="w-full" variant="gold">
          Say hello
        </Button>
      </Link>
      <button type="button" onClick={onClose} className="mt-5 text-sm text-muted">
        Keep swiping
      </button>
    </motion.div>
  );
}
