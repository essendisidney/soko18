"use client";

import Link from "next/link";
import { nairobiProfiles } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import { blocksSnapshot, subscribeBlocks, writeBlock } from "@/lib/blocks/local";
import { postBlock } from "@/lib/safety/client";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { useAuth } from "@/lib/auth/use-auth";
import { ProfileCard } from "@/components/soko/profile-card";
import { Button } from "@/components/soko/button";

export default function BlockedPage() {
  const { user } = useAuth();
  const blocked = useLocalIds(subscribeBlocks, blocksSnapshot);
  const byId = new Map(nairobiProfiles().filter(hasApprovedCover).map((p) => [p.id, p]));
  const items = blocked.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div>
      <h1 className="font-display text-[34px] tracking-tight">Blocked</h1>
      <p className="mt-2 text-sm text-muted">Hidden from Discover and Browse. Unblock anytime.</p>

      {items.length === 0 ? (
        <div className="mt-10">
          <p className="text-sm text-muted">No one blocked.</p>
          <Link href="/discover" className="mt-6 inline-block">
            <Button variant="gold">Discover</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3">
          {items.map((profile) => (
            <div key={profile.id} className="relative">
              <ProfileCard profile={profile} compact href={`/profile/${profile.slug}`} />
              <button
                type="button"
                aria-label={`Unblock ${profile.name}`}
                className="absolute top-2 right-2 z-10 rounded-full bg-black/55 px-2.5 py-1 text-[11px] tracking-wide text-cream"
                onClick={() => {
                  writeBlock(profile.id, false);
                  if (user) void postBlock(profile.id, false);
                }}
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
