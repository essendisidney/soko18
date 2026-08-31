"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SeedProfile } from "@/lib/types";
import { coverPhoto } from "@/lib/media/public";
import { PresenceDot } from "@/components/soko/presence-dot";
import { VerificationBadge } from "@/components/soko/verification-badge";
import { sokoVerified } from "@/lib/trust/verified";

export function ProfileCard({
  profile,
  className,
  href,
  compact = false,
}: {
  profile: SeedProfile;
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  const cover = coverPhoto(profile);
  if (!cover) return null;

  const inner = (
    <div
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
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/15 to-transparent" />
      {profile.featured ? (
        <p className="absolute top-3 left-3 rounded-full border border-gold/70 bg-black/40 px-2 py-0.5 font-display text-[10px] tracking-[0.16em] text-gold">
          FEATURED
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
