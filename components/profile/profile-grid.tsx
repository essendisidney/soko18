"use client";

import { SearchNotifyButton } from "@/components/nairobi/search-notify";
import { hideBlocked } from "@/lib/safety/flags";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { ProfileCard } from "@/components/soko/profile-card";
import type { SeedProfile } from "@/lib/types";

export function ProfileGrid({
  profiles,
  emptyText = "No live profiles in this view yet.",
  emptyNotify,
}: {
  profiles: SeedProfile[];
  emptyText?: string;
  emptyNotify?: string;
}) {
  const visible = hideBlocked(profiles, useLocalIds(subscribeBlocks, blocksSnapshot));
  if (visible.length === 0) {
    return (
      <div className="col-span-2">
        <p className="text-sm text-muted">{emptyText}</p>
        {emptyNotify ? <SearchNotifyButton query={emptyNotify} /> : null}
      </div>
    );
  }
  return (
    <>
      {visible.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} compact href={`/profile/${profile.slug}`} />
      ))}
    </>
  );
}
