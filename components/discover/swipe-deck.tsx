"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import type { SeedProfile } from "@/lib/types";
import { ProfileCard } from "@/components/soko/profile-card";
import { Button } from "@/components/soko/button";
import { Star, X, Heart } from "lucide-react";

const SWIPE = 96;
const FLICK = 420;
const SNAP = { type: "spring" as const, stiffness: 380, damping: 32 };
const FLY_EASE = [0.22, 1, 0.36, 1] as const;

type Exit = {
  key: string;
  profile: SeedProfile;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  rotate: number;
  duration: number;
};

function throwDuration(speed: number) {
  if (speed < 480) return 0.28;
  return Math.max(0.18, Math.min(0.28, 220 / speed));
}

function throwAway() {
  if (typeof window === "undefined") return 720;
  return Math.max(window.innerWidth, window.innerHeight) * 1.2;
}

export function SwipeDeck({
  profiles,
  onEmpty,
  onLike,
  onPass,
  onUndo,
  canUndo,
  browseHref = "/nairobi",
  browseLabel = "Browse",
  emptyTitle = "That’s everyone around you",
  onEngage,
  onImpression,
}: {
  profiles: SeedProfile[];
  onEmpty?: () => void;
  onLike?: (profile: SeedProfile, kind: "like" | "spotlight") => void;
  onPass?: (profile: SeedProfile) => void;
  onUndo?: () => string | null;
  canUndo?: boolean;
  browseHref?: string;
  browseLabel?: string;
  emptyTitle?: string;
  onEngage?: (profile: SeedProfile, kind: "like" | "spotlight") => boolean;
  onImpression?: (profile: SeedProfile) => void;
}) {
  const router = useRouter();
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [exits, setExits] = useState<Exit[]>([]);
  const busy = useRef(false);
  const queue = profiles.filter((profile) => !gone.has(profile.id));
  const current = queue[0];
  const behind = queue[1];

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-8, 8]);
  const likeOpacity = useTransform(x, [28, 110], [0, 1]);
  const passOpacity = useTransform(x, [-110, -28], [1, 0]);
  const spotOpacity = useTransform(y, [-110, -28], [1, 0]);
  const goldWash = useTransform(y, [-160, -36], [0.22, 0]);
  const lift = useTransform([x, y], ([latestX, latestY]: number[]) =>
    Math.min(1, Math.max(Math.abs(latestX), Math.abs(latestY)) / 130),
  );
  const peekScale = useTransform(lift, [0, 1], [0.965, 1]);
  const peekOpacity = useTransform(lift, [0, 1], [0.62, 1]);

  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!current || seen.current.has(current.id)) return;
    seen.current.add(current.id);
    onImpression?.(current);
  }, [current, onImpression]);

  useEffect(() => {
    if (!current && !exits.length) onEmpty?.();
  }, [current, exits.length, onEmpty]);

  useLayoutEffect(() => {
    x.jump(0);
    y.jump(0);
  }, [current?.id, x, y]);

  function snapBack() {
    animate(x, 0, SNAP);
    animate(y, 0, SNAP);
  }

  function commit(dir: "left" | "right" | "up", speed = 0) {
    if (!current || busy.current) return;
    if (dir !== "left") {
      const kind = dir === "up" ? "spotlight" : "like";
      if (onEngage?.(current, kind) === false) {
        snapBack();
        return;
      }
    }

    busy.current = true;
    const profile = current;
    const fromX = x.get();
    const fromY = y.get();
    const tilt = rotate.get();
    const away = throwAway();
    const toX = dir === "right" ? away : dir === "left" ? -away : fromX * 1.15;
    const toY = dir === "up" ? -away : fromY * 1.15;
    const flyRotate = dir === "up" ? tilt : tilt + (dir === "right" ? 10 : -10);

    setExits((prev) => [
      ...prev,
      {
        key: `${profile.id}-${Date.now()}`,
        profile,
        fromX,
        fromY,
        toX,
        toY,
        rotate: flyRotate,
        duration: throwDuration(speed),
      },
    ]);
    setGone((prev) => {
      const next = new Set(prev);
      next.add(profile.id);
      return next;
    });

    if (dir === "left") onPass?.(profile);
    if (dir === "right") onLike?.(profile, "like");
    if (dir === "up") onLike?.(profile, "spotlight");
    busy.current = false;
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (busy.current) return;
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    const flickX = Math.abs(velocity.x);
    const flickY = Math.abs(velocity.y);
    const vertical = absY + flickY * 0.12 > absX + flickX * 0.12;

    if (vertical) {
      if (offset.y < -SWIPE || velocity.y < -FLICK) {
        commit("up", flickY);
        return;
      }
      snapBack();
      return;
    }

    if (offset.x > SWIPE || velocity.x > FLICK) {
      commit("right", flickX);
      return;
    }
    if (offset.x < -SWIPE || velocity.x < -FLICK) {
      commit("left", flickX);
      return;
    }
    snapBack();
  }

  if (!current && exits.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-2xl">{emptyTitle}</p>
        <p className="mt-2 text-sm text-muted">A pass stays off Discover for 30 days. Browse still open. Empty stays empty.</p>
        <Link href={browseHref} className="mt-8 w-full max-w-xs">
          <Button className="w-full" variant="gold">
            {browseLabel}
          </Button>
        </Link>
        {canUndo ? (
          <button
            type="button"
            className="mt-4 text-sm text-cream/80"
            onClick={() => {
              const id = onUndo?.();
              if (!id) return;
              setGone((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }}
          >
            Undo last pass
          </button>
        ) : null}
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
          <motion.div
            className="pointer-events-none absolute inset-0 origin-bottom"
            style={{ scale: peekScale, opacity: peekOpacity }}
            aria-hidden
          >
            <ProfileCard profile={behind} />
          </motion.div>
        ) : null}

        {current ? (
          <motion.div
            key={current.id}
            className="absolute inset-0 z-10 cursor-grab touch-none overscroll-none active:cursor-grabbing"
            style={{ x, y, rotate, originX: 0.5, originY: 0.92 }}
            drag
            dragDirectionLock
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => {
              x.stop();
              y.stop();
            }}
            onDragEnd={onDragEnd}
            onTap={() => {
              if (busy.current) return;
              if (Math.abs(x.get()) > 8 || Math.abs(y.get()) > 8) return;
              router.push(`/profile/${current.slug}`);
            }}
          >
            <ProfileCard profile={current} />
            <motion.div
              style={{ opacity: goldWash }}
              className="pointer-events-none absolute inset-0 rounded-[28px] bg-gold/40"
            />
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
        ) : null}

        {exits.map((exit) => (
          <motion.div
            key={exit.key}
            className="pointer-events-none absolute inset-0 z-20"
            initial={{ x: exit.fromX, y: exit.fromY, rotate: exit.rotate, opacity: 1, originX: 0.5, originY: 0.92 }}
            animate={{ x: exit.toX, y: exit.toY, rotate: exit.rotate, opacity: 0 }}
            transition={{ duration: exit.duration, ease: FLY_EASE }}
            onAnimationComplete={() => {
              setExits((prev) => prev.filter((row) => row.key !== exit.key));
            }}
          >
            <ProfileCard profile={exit.profile} />
          </motion.div>
        ))}
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
