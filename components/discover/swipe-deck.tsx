"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import type { SeedProfile } from "@/lib/types";
import { ProfileCard } from "@/components/soko/profile-card";
import { publicPhotos } from "@/lib/media/public";
import { Button } from "@/components/soko/button";
import type { ReactNode } from "react";
import { Star, X, Heart, RotateCcw } from "lucide-react";
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
  emptyHint = "People you pass stay hidden for 30 days. New people join every day.",
  notifyCity,
  emptyExtra,
  onEngage,
  onImpression,
  restore,
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
  /** Bring a card back (e.g. a like that didn't go through). Bump `n` to trigger. */
  restore?: { id: string; n: number } | null;
}) {
  const router = useRouter();
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [exits, setExits] = useState<Exit[]>([]);
  const busy = useRef(false);
  const [restored, setRestored] = useState(0);
  if (restore && restore.n !== restored) {
    setRestored(restore.n);
    if (gone.has(restore.id)) {
      const next = new Set(gone);
      next.delete(restore.id);
      setGone(next);
    }
  }
  const queue = profiles.filter((profile) => !gone.has(profile.id));
  const current = queue[0];
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  if ((current?.id ?? null) !== photoFor) {
    setPhotoFor(current?.id ?? null);
    setPhotoIndex(0);
  }
  const behind = queue[1];

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-8, 8]);
  const likeOpacity = useTransform(x, [28, 110], [0, 1]);
  const passOpacity = useTransform(x, [-110, -28], [1, 0]);
  const spotOpacity = useTransform(y, [-110, -28], [1, 0]);
  const goldWash = useTransform(y, [-160, -36], [0.22, 0]);
  const likeGlow = useTransform(x, [20, 140], [0, 1]);
  const passGlow = useTransform(x, [-140, -20], [1, 0]);
  const lift = useTransform([x, y], ([latestX, latestY]: number[]) =>
    Math.min(1, Math.max(Math.abs(latestX), Math.abs(latestY)) / 130),
  );
  const peekScale = useTransform(lift, [0, 1], [0.94, 1]);
  const peekY = useTransform(lift, [0, 1], [14, 0]);
  const peekOpacity = useTransform(lift, [0, 1], [0.55, 1]);

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

  // Desktop: arrow keys swipe (left pass, right like, up Super Like).
  const commitRef = useRef<(dir: "left" | "right" | "up") => void>(() => {});
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      const dir = event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : event.key === "ArrowUp" ? "up" : null;
      if (!dir) return;
      event.preventDefault();
      commitRef.current(dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  useEffect(() => {
    commitRef.current = (dir) => commit(dir);
  });

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
            style={{ scale: peekScale, y: peekY, opacity: peekOpacity }}
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
            onTap={(event, info) => {
              if (busy.current) return;
              if (Math.abs(x.get()) > 8 || Math.abs(y.get()) > 8) return;
              // Tap the left or right edge to flip photos; the middle opens the profile.
              if ((event.target as HTMLElement | null)?.closest("[data-open]")) {
                router.push(`/profile/${current.slug}`);
                return;
              }
              const target = (event.target as HTMLElement | null)?.closest("[data-card]") as HTMLElement | null;
              const rect = target?.getBoundingClientRect();
              const total = publicPhotos(current).length;
              if (rect && total > 1) {
                const rel = (info.point.x - rect.left) / rect.width;
                if (rel < 0.3) {
                  setPhotoIndex((i) => Math.max(0, i - 1));
                  return;
                }
                if (rel > 0.7) {
                  setPhotoIndex((i) => Math.min(total - 1, i + 1));
                  return;
                }
              }
              router.push(`/profile/${current.slug}`);
            }}
          >
            <ProfileCard profile={current} photoIndex={photoIndex} />
            <motion.div
              style={{ opacity: goldWash }}
              className="pointer-events-none absolute inset-0 rounded-[32px] bg-linear-to-t from-sky-400/50 to-transparent"
            />
            <motion.div
              style={{ opacity: likeGlow }}
              className="pointer-events-none absolute inset-0 rounded-[32px] shadow-[inset_0_0_0_3px_var(--gold),inset_0_0_80px_rgba(212,181,106,0.35)]"
            />
            <motion.div
              style={{ opacity: passGlow }}
              className="pointer-events-none absolute inset-0 rounded-[32px] shadow-[inset_0_0_0_3px_rgb(251,113,133),inset_0_0_80px_rgba(251,113,133,0.3)]"
            />
            <motion.div
              style={{ opacity: likeOpacity }}
              className="pointer-events-none absolute top-14 left-6 -rotate-12 rounded-xl border-[3px] border-gold bg-black/30 px-3 py-1 text-3xl font-black tracking-[0.12em] text-gold backdrop-blur-sm"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="pointer-events-none absolute top-14 right-6 rotate-12 rounded-xl border-[3px] border-rose-400 bg-black/30 px-3 py-1 text-3xl font-black tracking-[0.12em] text-rose-400 backdrop-blur-sm"
            >
              PASS
            </motion.div>
            <motion.div
              style={{ opacity: spotOpacity }}
              className="pointer-events-none absolute bottom-40 left-1/2 -translate-x-1/2 -rotate-6 rounded-xl border-[3px] border-sky-400 bg-black/30 px-3 py-1 text-2xl font-black tracking-[0.12em] whitespace-nowrap text-sky-400 backdrop-blur-sm"
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

      <div className="pointer-events-none relative z-30 -mt-[4.75rem] flex justify-center pb-2">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-bg/70 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
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
          <ActionButton label="Pass" size="lg" tone="pass" onClick={() => commit("left")}>
            <X className="size-7 text-rose-400" strokeWidth={2.8} />
          </ActionButton>
          <ActionButton label="Super Like" size="sm" tone="super" onClick={() => commit("up")}>
            <Star className="size-[18px] fill-sky-400 text-sky-400" />
          </ActionButton>
          <ActionButton label="Like" size="lg" tone="like" onClick={() => commit("right")}>
            <Heart className="size-7 fill-bg text-bg" />
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  size,
  tone,
  disabled,
  onClick,
  children,
}: {
  label: string;
  size: "sm" | "lg";
  tone?: "pass" | "super" | "like";
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
        "grid place-items-center rounded-full transition duration-150 active:scale-90 disabled:opacity-35",
        size === "lg" ? "size-[3.75rem]" : "size-11",
        tone === "like"
          ? "bg-linear-to-br from-gold-2 to-gold shadow-[0_8px_28px_rgba(212,181,106,0.45)]"
          : tone === "pass"
            ? "border border-rose-400/30 bg-rose-400/10"
            : tone === "super"
              ? "border border-sky-400/30 bg-sky-400/10"
              : "border border-white/10 bg-white/5",
      )}
    >
      {children}
    </button>
  );
}
