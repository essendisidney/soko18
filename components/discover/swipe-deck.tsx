"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import type { SeedProfile } from "@/lib/types";
import { ProfileCard } from "@/components/soko/profile-card";
import { Button } from "@/components/soko/button";
import { Star, X, Heart } from "lucide-react";

const SWIPE = 108;

export function SwipeDeck({
  profiles,
  onEmpty,
  onLike,
}: {
  profiles: SeedProfile[];
  onEmpty?: () => void;
  onLike?: (profile: SeedProfile, kind: "like" | "spotlight") => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [exit, setExit] = useState<"left" | "right" | "up" | null>(null);

  const current = profiles[index];
  const next = profiles[index + 1];

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);
  const spotOpacity = useTransform(y, [-120, -20], [1, 0]);

  const remaining = useMemo(() => profiles.slice(index), [profiles, index]);

  function commit(dir: "left" | "right" | "up") {
    if (!current) return;
    setExit(dir);
    if (dir === "right") onLike?.(current, "like");
    if (dir === "up") onLike?.(current, "spotlight");
    window.setTimeout(() => {
      x.set(0);
      y.set(0);
      setExit(null);
      const nextIndex = index + 1;
      setIndex(nextIndex);
      if (nextIndex >= profiles.length) onEmpty?.();
    }, 280);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.y < -96 || velocity.y < -700) {
      commit("up");
      return;
    }
    if (offset.x > SWIPE || velocity.x > 650) {
      commit("right");
      return;
    }
    if (offset.x < -SWIPE || velocity.x < -650) {
      commit("left");
      return;
    }
  }

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <p className="font-display text-2xl">That’s everyone nearby</p>
          <p className="mt-2 text-sm text-muted">Browse a city, or check again later.</p>
        </div>
      </div>
    );
  }

  const fly =
    exit === "right"
      ? { x: 480, opacity: 0, rotate: 12 }
      : exit === "left"
        ? { x: -480, opacity: 0, rotate: -12 }
        : exit === "up"
          ? { y: -520, opacity: 0, scale: 0.96 }
          : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        {next ? (
          <div className="absolute inset-0 origin-bottom scale-[0.97] opacity-70">
            <ProfileCard profile={next} />
          </div>
        ) : null}

        <AnimatePresence>
          <motion.div
            key={current.id + remaining.length}
            className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
            style={{ x, y, rotate }}
            drag
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            animate={fly}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onTap={() => {
              if (Math.abs(x.get()) > 10 || Math.abs(y.get()) > 10) return;
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
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-7 py-5">
        <div className="flex flex-col items-center gap-1.5">
          <Button variant="icon" size="icon" aria-label="Pass" onClick={() => commit("left")}>
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
            onClick={() => commit("right")}
          >
            <Heart className="size-7 fill-bg text-bg" />
          </Button>
          <span className="text-[11px] tracking-wide text-muted">Like</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Button variant="icon" size="icon" aria-label="Spotlight" onClick={() => commit("up")}>
            <Star className="size-6 text-gold" />
          </Button>
          <span className="text-[11px] tracking-wide text-muted">Spotlight</span>
        </div>
      </div>
    </div>
  );
}
