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

  const inner = (
    <div
      data-card
      className={cn(
        "relative overflow-hidden bg-bg-elevated",
        compact ? "aspect-[3/4] rounded-[22px]" : "h-full rounded-[28px]",
        className,
      )}
    >
      <Image
        src={cover}
        alt={`${profile.name}, ${profile.age}`}
        fill
        className="object-cover"
        sizes={compact ? "50vw" : "100vw"}
        priority={!compact}
        key={cover}
        // Member photos are already resized on upload; skip paid image optimisation.
        unoptimized={cover.startsWith("http")}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/15 to-transparent" />
      {!compact && profile.photos.length > 1 ? (
        <div className="absolute inset-x-4 top-2.5 flex gap-1" aria-label={`${profile.photos.length} photos`}>
          {profile.photos.map((src, i) => (
            <span key={src} className={cn("h-1 flex-1 rounded-full", i === Math.min(photoIndex, all.length - 1) ? "bg-cream/90" : "bg-cream/30")} />
          ))}
        </div>
      ) : null}
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
        {sokoVerified(profile) ? (
          <VerificationBadge className="mb-2" />
        ) : null}
        <p className={cn("font-display font-semibold tracking-tight text-cream", compact ? "text-lg" : "text-[28px]")}>
          {profile.name}, {profile.age}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[13px] text-cream/80">
          <span>{profile.area}</span>
          <PresenceDot presence={profile.presence} />
        </div>
        {!compact && (profile.prompts?.[0]?.a || profile.bio) ? (
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-cream/85">
            {profile.prompts?.[0]?.a ? `“${profile.prompts[0].a}”` : profile.bio}
          </p>
        ) : null}
        {!compact && profile.lookingFor ? (
          <span className="mt-2 inline-block rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-cream/90">
            {INTENTS.find((i) => i.id === profile.lookingFor)?.label}
          </span>
        ) : null}
      </div>
    </div>
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
