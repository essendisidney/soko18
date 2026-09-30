"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import type { SeedProfile } from "@/lib/types";
import { ProfileCard } from "@/components/soko/profile-card";
import { Button } from "@/components/soko/button";
import type { ReactNode } from "react";
import { Star, X, Heart, RotateCcw, Zap } from "lucide-react";
import { CityNotifyButton } from "@/components/nairobi/waitlist-button";
import { EmptyCityLoop } from "@/components/city/city-door";
import { cn } from "@/lib/utils";

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
  browseHref = "/browse",
  browseLabel = "Browse",
  emptyTitle = "That’s everyone around you",
  emptyHint = "A pass stays off Discover for 30 days. Browse still open. Empty stays empty.",
  notifyCity,
  emptyExtra,
  onEngage,
  onImpression,
}: {
  profiles: SeedProfile[];
  onEmpty?: () => void;
  onLike?: (profile: SeedProfile, kind: "like" | "super") => void;
  onPass?: (profile: SeedProfile) => void;
  onUndo?: () => string | null;
  canUndo?: boolean;
  browseHref?: string;
  browseLabel?: string;
  emptyTitle?: string;
  emptyHint?: string;
  notifyCity?: string | null;
  /** Shown under the empty-state text, e.g. the launch meter. */
  emptyExtra?: ReactNode;
  onEngage?: (profile: SeedProfile, kind: "like" | "super") => boolean;
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
      const kind = dir === "up" ? "super" : "like";
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
    if (dir === "up") onLike?.(profile, "super");
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
      <div
        className={
          notifyCity
            ? "flex h-full flex-col items-center overflow-y-auto px-6 py-4 text-center"
            : "flex h-full flex-col items-center justify-center px-6 text-center"
        }
      >
        <p className="font-display text-2xl">{emptyTitle}</p>
        <p className="mt-2 text-sm text-muted">{emptyHint}</p>
        {emptyExtra ? <div className="mt-6 flex w-full justify-center">{emptyExtra}</div> : null}
        {notifyCity ? (
          <div className="mt-8 w-full max-w-xs">
            <CityNotifyButton slug={notifyCity} />
          </div>
        ) : null}
        <Link href={browseHref} className={notifyCity ? "mt-3 w-full max-w-xs" : "mt-8 w-full max-w-xs"}>
          <Button className="w-full" variant={notifyCity ? "ghost" : "gold"}>
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
        {notifyCity ? (
          <div className="mt-2 w-full max-w-xs">
            <EmptyCityLoop citySlug={notifyCity} compact />
          </div>
        ) : null}
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
              SUPER LIKE
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

      <div className="flex items-center justify-center gap-4 py-4">
        <ActionButton
          label="Rewind"
          size="sm"
          disabled={!canUndo}
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
          <RotateCcw className="size-[18px] text-amber-300" />
        </ActionButton>
        <ActionButton label="Pass" size="lg" onClick={() => commit("left")}>
          <X className="size-8 text-rose-400" strokeWidth={2.6} />
        </ActionButton>
        <ActionButton label="Super Like" size="sm" onClick={() => commit("up")}>
          <Star className="size-[18px] fill-sky-400 text-sky-400" />
        </ActionButton>
        <ActionButton label="Like" size="lg" gold onClick={() => commit("right")}>
          <Heart className="size-8 fill-bg text-bg" />
        </ActionButton>
        <Link
          href="/upgrade#boost"
          aria-label="Boost"
          className="grid size-11 place-items-center rounded-full border border-line bg-bg-elevated shadow-[0_6px_20px_rgba(0,0,0,0.45)] transition-transform active:scale-90"
        >
          <Zap className="size-[18px] fill-violet-400 text-violet-400" />
        </Link>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  size,
  gold,
  disabled,
  onClick,
  children,
}: {
  label: string;
  size: "sm" | "lg";
  gold?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-full transition-transform duration-100 active:scale-90 disabled:opacity-35",
        size === "lg" ? "size-16" : "size-11",
        gold
          ? "bg-gold shadow-[0_10px_36px_rgba(212,181,106,0.35)]"
          : "border border-line bg-bg-elevated shadow-[0_6px_20px_rgba(0,0,0,0.45)]",
      )}
    >
      {children}
    </button>
  );
}
