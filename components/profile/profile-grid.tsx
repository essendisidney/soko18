"use client";

import { hideBlocked } from "@/lib/safety/flags";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { ProfileCard } from "@/components/soko/profile-card";
import type { SeedProfile } from "@/lib/types";

export function ProfileGrid({ profiles }: { profiles: SeedProfile[] }) {
  const visible = hideBlocked(profiles, useLocalIds(subscribeBlocks, blocksSnapshot));
  if (visible.length === 0) {
    return <p className="col-span-2 text-sm text-muted">No live profiles in this view yet.</p>;
  }
  return (
    <>
      {visible.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} compact href={`/profile/${profile.slug}`} />
      ))}
    </>
  );
}
