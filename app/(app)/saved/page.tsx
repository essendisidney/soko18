"use client";

import Link from "next/link";
import { nairobiProfiles } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import { hideBlocked } from "@/lib/safety/flags";
import { favoritesSnapshot, subscribeFavorites } from "@/lib/favorites/local";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { ProfileCard } from "@/components/soko/profile-card";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";

export default function SavedPage() {
  const saved = useLocalIds(subscribeFavorites, favoritesSnapshot);
  const blocked = useLocalIds(subscribeBlocks, blocksSnapshot);
  const hidden = new Set(blocked);
  const byId = new Map(nairobiProfiles().filter(hasApprovedCover).map((p) => [p.id, p]));
  const items = hideBlocked(
    saved.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    hidden,
  );

  return (
    <div>
      <Wordmark size="sm" />
      <h1 className="mt-8 font-display text-[34px] tracking-tight">Saved</h1>
      <p className="mt-2 text-sm text-muted">People you want to come back to.</p>

      {items.length === 0 ? (
        <div className="mt-10">
          <p className="text-sm text-muted">Nothing saved yet.</p>
          <Link href="/discover" className="mt-6 inline-block">
            <Button variant="gold">Discover</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3">
          {items.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} compact href={`/profile/${profile.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
