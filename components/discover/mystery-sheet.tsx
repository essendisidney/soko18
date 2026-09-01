"use client";

import { ProfileCard } from "@/components/soko/profile-card";
import { Button } from "@/components/soko/button";
import type { SeedProfile } from "@/lib/types";

export function MysterySheet({
  profile,
  onPass,
  onLike,
  onClose,
}: {
  profile: SeedProfile;
  onPass: () => void;
  onLike: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg px-4 pt-10 pb-8">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Mystery</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">One card</h1>
      <p className="mt-2 text-sm text-muted">
        No swipe. One card after sandbox settle. Not a live listing.
      </p>
      <div className="relative mt-6 min-h-0 flex-1">
        <ProfileCard profile={profile} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" className="w-full" onClick={onPass}>
          Pass
        </Button>
        <Button type="button" variant="gold" className="w-full" onClick={onLike}>
          Like
        </Button>
      </div>
      <Button type="button" variant="ghost" className="mt-3 w-full" onClick={onClose}>
        Discover
      </Button>
    </div>
  );
}
