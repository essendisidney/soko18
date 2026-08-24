"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import type { SeedProfile } from "@/lib/types";
import { ProfileCard } from "@/components/soko/profile-card";
import { Button } from "@/components/soko/button";
import { Star, X, Heart } from "lucide-react";

const SWIPE = 96;
const FLICK = 350;
const SPRING = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.75 };

export function SwipeDeck({
  profiles,
  onEmpty,
  onLike,
  onPass,
  onEngage,
  onImpression,
}: {
  profiles: SeedProfile[];
  onEmpty?: () => void;
  onLike?: (profile: SeedProfile, kind: "like" | "spotlight") => void;
  onPass?: (profile: SeedProfile) => void;
  onEngage?: (profile: SeedProfile, kind: "like" | "spotlight") => boolean;
  onImpression?: (profile: SeedProfile) => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const busy = useRef(false);
  const current = profiles[index];
  const behind = profiles[index + 1];

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);
  const spotOpacity = useTransform(y, [-120, -20], [1, 0]);

  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!current || seen.current.has(current.id)) return;
    seen.current.add(current.id);
    onImpression?.(current);
  }, [current, onImpression]);

  function snapBack() {
    animate(x, 0, SPRING);
    animate(y, 0, SPRING);
  }

  async function commit(dir: "left" | "right" | "up") {
    if (!current || busy.current) return;
    if (dir !== "left") {
      const kind = dir === "up" ? "spotlight" : "like";
      if (onEngage?.(current, kind) === false) {
        snapBack();
        return;
      }
    }

    busy.current = true;
    setLocked(true);
    const profile = current;
    const away = typeof window === "undefined" ? 640 : Math.max(window.innerWidth, window.innerHeight) * 1.15;
    const toX = dir === "right" ? away : dir === "left" ? -away : x.get();
    const toY = dir === "up" ? -away : y.get();

    try {
      await Promise.all([
        animate(x, toX, { duration: 0.2, ease: [0.32, 0.72, 0, 1] }),
        animate(y, toY, { duration: 0.2, ease: [0.32, 0.72, 0, 1] }),
      ]);

      if (dir === "left") onPass?.(profile);
      if (dir === "right") onLike?.(profile, "like");
      if (dir === "up") onLike?.(profile, "spotlight");

      x.set(0);
      y.set(0);
      const nextIndex = index + 1;
      setIndex(nextIndex);
      if (nextIndex >= profiles.length) onEmpty?.();
    } finally {
      busy.current = false;
      setLocked(false);
    }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (busy.current) return;
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    const vertical = absY > absX || Math.abs(velocity.y) > Math.abs(velocity.x);

    if (vertical) {
      if (offset.y < -SWIPE || velocity.y < -FLICK) {
        void commit("up");
        return;
      }
      snapBack();
      return;
    }

    if (offset.x > SWIPE || velocity.x > FLICK) {
      void commit("right");
      return;
    }
    if (offset.x < -SWIPE || velocity.x < -FLICK) {
      void commit("left");
      return;
    }
    snapBack();
  }

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-2xl">That’s everyone nearby</p>
        <p className="mt-2 text-sm text-muted">Browse Nairobi. Come back later for a new deck.</p>
        <Link href="/browse" className="mt-8 w-full max-w-xs">
          <Button className="w-full" variant="gold">
            Browse
          </Button>
        </Link>
        <Link href="/saved" className="mt-4 text-sm text-muted">
          Saved
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        {behind ? (
          <div className="pointer-events-none absolute inset-0 origin-bottom scale-[0.97] opacity-70" aria-hidden>
            <ProfileCard profile={behind} />
          </div>
        ) : null}

        <motion.div
          className="absolute inset-0 z-10 cursor-grab touch-none overscroll-none active:cursor-grabbing"
          style={{ x, y, rotate }}
          drag={locked ? false : true}
          dragMomentum={false}
          dragElastic={0.16}
          onDragEnd={onDragEnd}
          onTap={() => {
            if (busy.current) return;
            if (Math.abs(x.get()) > 8 || Math.abs(y.get()) > 8) return;
            router.push(`/profile/${current.slug}`);
          }}
        >
          <ProfileCard profile={current} />
          <motion.div
            style={{ opacity: likeOpacity }}
            className="pointer-events-none absolute top-8 right-6 rounded-full border border-gold px-3 py-1 font-display text-sm tracking-widest text-gold"
          >
            LIKE
          </motion.div>
          <motion.div
            style={{ opacity: passOpacity }}
            className="pointer-events-none absolute top-8 left-6 rounded-full border border-cream/50 px-3 py-1 font-display text-sm tracking-widest text-cream"
          >
            PASS
          </motion.div>
          <motion.div
            style={{ opacity: spotOpacity }}
            className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-full border border-gold px-3 py-1 font-display text-sm tracking-widest text-gold"
          >
            SPOTLIGHT
          </motion.div>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-7 py-5">
        <div className="flex flex-col items-center gap-1.5">
          <Button variant="icon" size="icon" aria-label="Pass" onClick={() => void commit("left")}>
            <X className="size-6 text-cream/80" />
          </Button>
          <span className="text-[11px] tracking-wide text-muted">Pass</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Button
            variant="gold"
            size="icon"
            aria-label="Like"
            className="size-16 shadow-[0_10px_40px_rgba(212,181,106,0.28)]"
            onClick={() => void commit("right")}
          >
            <Heart className="size-7 fill-bg text-bg" />
          </Button>
          <span className="text-[11px] tracking-wide text-muted">Like</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Button variant="icon" size="icon" aria-label="Spotlight" onClick={() => void commit("up")}>
            <Star className="size-6 text-gold" />
          </Button>
          <span className="text-[11px] tracking-wide text-muted">Spotlight</span>
        </div>
      </div>
    </div>
  );
}
