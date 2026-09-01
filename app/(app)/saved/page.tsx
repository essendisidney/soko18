"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { nairobiProfiles } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import { hideBlocked } from "@/lib/safety/flags";
import { favoritesSnapshot, subscribeFavorites, writeFavorite } from "@/lib/favorites/local";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { ProfileCard } from "@/components/soko/profile-card";
import { Button } from "@/components/soko/button";

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
      <h1 className="font-display text-[34px] tracking-tight">Saved</h1>
      <p className="mt-2 text-sm text-muted">People you want to come back to.</p>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-muted">Nothing saved yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3">
          {items.map((profile) => (
            <div key={profile.id} className="relative">
              <ProfileCard profile={profile} compact href={`/profile/${profile.slug}`} />
              <button
                type="button"
                aria-label={`Remove ${profile.name}`}
                className="absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full bg-black/55 text-cream"
                onClick={() => writeFavorite(profile.id, false)}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Link href="/discover" className="mt-8 inline-block">
        <Button variant="gold">Discover</Button>
      </Link>
    </div>
  );
}
