"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { PresenceDot } from "@/components/soko/presence-dot";
import { VerificationBadge } from "@/components/soko/verification-badge";
import { Button } from "@/components/soko/button";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import type { MatchListItem } from "@/lib/likes/list";
import {
  isFreshMatch,
  matchSeenSnapshot,
  subscribeMatchSeen,
  writeMatchWaiting,
} from "@/lib/matches/waiting";
import { matchPreview } from "@/lib/messages/preview";
import { useLocalIds } from "@/lib/safety/use-id-list";

export function MatchList({ items }: { items: MatchListItem[] }) {
  const blocked = useLocalIds(subscribeBlocks, blocksSnapshot);
  const seen = useLocalIds(subscribeMatchSeen, matchSeenSnapshot);
  const hidden = new Set(blocked);
  const seenSet = new Set(seen);
  const visible = items.filter((item) => !hidden.has(item.profileId));

  useEffect(() => {
    const blockedIds = new Set(blocked);
    const opened = new Set(seen);
    for (const item of items) {
      if (blockedIds.has(item.profileId)) {
        writeMatchWaiting(item.profileId, false);
        continue;
      }
      writeMatchWaiting(item.profileId, isFreshMatch(item.lastMessage, opened.has(item.profileId)));
    }
  }, [items, blocked, seen]);

  return (
    <>
      {visible.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No matches yet. A like stays quiet until they like you back.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                href={`/messages/${item.slug}`}
                className="flex items-center gap-4 rounded-3xl border border-line bg-glass p-3"
              >
                <div className="relative size-16 overflow-hidden rounded-2xl bg-bg-elevated">
                  {item.photo ? (
                    <Image src={item.photo} alt={item.name} fill sizes="64px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {item.verified ? <VerificationBadge label="" className="px-1.5" /> : null}
                    {isFreshMatch(item.lastMessage, seenSet.has(item.profileId)) ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                    ) : null}
                  </div>
                  <PresenceDot presence={item.presence} className="mt-1 text-xs" />
                  <p className="mt-1 truncate text-sm text-muted">{matchPreview(item.lastMessage)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/discover" className="mt-8 inline-block w-full">
        <Button className="w-full" variant="gold">
          Discover
        </Button>
      </Link>
    </>
  );
}
