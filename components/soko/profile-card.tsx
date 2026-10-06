"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SeedProfile } from "@/lib/types";
import { coverPhoto, publicPhotos } from "@/lib/media/public";
import { PresenceDot } from "@/components/soko/presence-dot";
import { VerificationBadge } from "@/components/soko/verification-badge";
import { sokoVerified } from "@/lib/trust/verified";
import { INTENTS } from "@/lib/data/nairobi";
import { BadgeCheck, ChevronUp, GraduationCap, Heart, MapPin, Zap } from "lucide-react";

export function ProfileCard({
  profile,
  className,
  href,
  compact = false,
  photoIndex = 0,
}: {
  profile: SeedProfile;
  className?: string;
  href?: string;
  compact?: boolean;
  /** Which photo to show (Discover lets you tap through them). */
  photoIndex?: number;
}) {
  const all = publicPhotos(profile);
  const cover = all[Math.min(photoIndex, all.length - 1)] ?? coverPhoto(profile);
  if (!cover) return null;

  const inner = compact ? (
    <div data-card className={cn("relative aspect-[3/4] overflow-hidden rounded-[22px] bg-bg-elevated", className)}>
      <Image
        src={cover}
        alt={`${profile.name}, ${profile.age}`}
        fill
        className="object-cover"
        sizes="50vw"
        key={cover}
        // Member photos are already resized on upload; skip paid image optimisation.
        unoptimized={cover.startsWith("http")}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/15 to-transparent" />
      {profile.isTest ? (
        <p className="absolute top-3 right-3 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-white">
          TEST
        </p>
      ) : null}
      {profile.featured ? (
        <p className="absolute top-3 left-3 rounded-full border border-gold/70 bg-black/40 px-2 py-0.5 font-display text-[10px] tracking-[0.16em] text-gold">
          BOOSTED
        </p>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-4">
        {sokoVerified(profile) ? <VerificationBadge className="mb-2" /> : null}
        <p className="font-display text-lg font-semibold tracking-tight text-cream">
          {profile.name}, {profile.age}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[13px] text-cream/80">
          <span>{profile.area}</span>
          {profile.campus ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-cream/90">
              <GraduationCap className="size-3 text-gold" aria-hidden />
              {profile.campus}
            </span>
          ) : null}
          <PresenceDot presence={profile.presence} />
        </div>
      </div>
    </div>
  ) : (
    <FullCard profile={profile} cover={cover} total={all.length} photoIndex={photoIndex} className={className} />
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }

  return inner;
}

/** Discover's big card: full-bleed photo, name up front, the first prompt as a quote. */
function FullCard({
  profile,
  cover,
  total,
  photoIndex,
  className,
}: {
  profile: SeedProfile;
  cover: string;
  total: number;
  photoIndex: number;
  className?: string;
}) {
  const prompt = profile.prompts?.find((row) => row.a);
  const intent = profile.lookingFor ? INTENTS.find((i) => i.id === profile.lookingFor)?.label : null;
  const shown = Math.min(photoIndex, total - 1);

  return (
    <div
      data-card
      className={cn(
        "relative h-full overflow-hidden rounded-[32px] bg-bg-elevated shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]",
        profile.featured ? "ring-2 ring-gold/70" : "ring-1 ring-white/10",
        className,
      )}
    >
      <Image
        src={cover}
        alt={`${profile.name}, ${profile.age}`}
        fill
        className="object-cover"
        sizes="(max-width: 480px) 100vw, 480px"
        priority
        key={cover}
        // Member photos are already resized on upload; skip paid image optimisation.
        unoptimized={cover.startsWith("http")}
      />
      <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-linear-to-t from-black via-black/70 to-transparent" />

      {total > 1 ? (
        <div className="absolute inset-x-3 top-3 flex gap-1" aria-label={`Photo ${shown + 1} of ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-[3px] flex-1 rounded-full transition-colors",
                i === shown ? "bg-cream shadow-[0_0_6px_rgba(255,255,255,0.6)]" : "bg-cream/25",
              )}
            />
          ))}
        </div>
      ) : null}

      <div className="absolute inset-x-3 top-6 flex items-start justify-between gap-2">
        {profile.featured ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-bg">
            <Zap className="size-3 fill-bg" aria-hidden />
            BOOSTED
          </span>
        ) : (
          <span />
        )}
        {profile.isTest ? (
          <span className="rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-white">
            TEST
          </span>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 px-5 pt-5 pb-[5.75rem]">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-display text-[34px] leading-none font-bold tracking-tight text-cream">
              <span className="truncate">{profile.name}</span>
              <span className="font-normal text-cream/75">{profile.age}</span>
              {sokoVerified(profile) ? (
                <BadgeCheck className="size-6 shrink-0 fill-gold text-bg" aria-label="Verified" />
              ) : null}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Tag>
                <MapPin className="size-3 text-gold" aria-hidden />
                {profile.area}
              </Tag>
              <Tag>
                <PresenceDot presence={profile.presence} className="text-[12px] text-cream" />
              </Tag>
              {profile.campus ? (
                <Tag>
                  <GraduationCap className="size-3 text-gold" aria-hidden />
                  {profile.campus}
                </Tag>
              ) : null}
            </div>
          </div>
          <span
            data-open
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur-md"
            aria-hidden
          >
            <ChevronUp className="size-5 text-cream" />
          </span>
        </div>

        {prompt ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5 backdrop-blur-md">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">{prompt.q}</p>
            <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-cream">{prompt.a}</p>
          </div>
        ) : profile.bio ? (
          <p className="mt-3 line-clamp-2 text-[15px] leading-snug text-cream/85">{profile.bio}</p>
        ) : null}

        {intent ? (
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] text-cream/75">
            <Heart className="size-3 fill-gold text-gold" aria-hidden />
            {intent}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[12px] text-cream backdrop-blur-md">
      {children}
    </span>
  );
}
