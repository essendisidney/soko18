"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { Heart, MessageCircle } from "lucide-react";
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
import { cityNameBySlug, emptyMatchesLine } from "@/lib/geo/kenya";
import { useSnappedCity } from "@/lib/nairobi/use-near-area";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { cn } from "@/lib/utils";

function Avatar({ item, size }: { item: MatchListItem; size: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-full bg-bg-elevated" style={{ width: size, height: size }}>
      {item.photo ? (
        <Image
          src={item.photo}
          alt={item.name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized={item.photo.startsWith("http")}
        />
      ) : (
        <span className="grid h-full w-full place-items-center font-display text-xl text-gold">{item.name.slice(0, 1)}</span>
      )}
    </div>
  );
}

export function MatchList({ items }: { items: MatchListItem[] }) {
  const citySlug = useSnappedCity();
  const blocked = useLocalIds(subscribeBlocks, blocksSnapshot);
  const seen = useLocalIds(subscribeMatchSeen, matchSeenSnapshot);
  const hidden = new Set(blocked);
  const seenSet = new Set(seen);
  const visible = items.filter((item) => !hidden.has(item.profileId));
  const fresh = visible.filter((item) => !item.lastMessage);
  const talking = visible.filter((item) => item.lastMessage);

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
      <section className="mt-6">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">New matches</h2>
        <div className="rail-x -mx-5 mt-3 flex gap-3 px-5 pb-1">
          <Link href="/likes" className="flex w-[76px] shrink-0 flex-col items-center gap-1.5">
            <div className="grid size-[76px] place-items-center rounded-full bg-linear-to-br from-gold to-amber-600 p-[2px]">
              <div className="grid h-full w-full place-items-center rounded-full bg-bg">
                <Heart className="size-7 fill-gold text-gold" />
              </div>
            </div>
            <span className="text-xs text-gold">Likes</span>
          </Link>
          {fresh.map((item) => {
            const isNew = isFreshMatch(item.lastMessage, seenSet.has(item.profileId));
            return (
              <Link key={item.id} href={`/messages/${item.slug}`} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5">
                <div className={cn("rounded-full p-[2px]", isNew ? "bg-gold" : "bg-line")}>
                  <div className="rounded-full bg-bg p-[2px]">
                    <Avatar item={item} size={68} />
                  </div>
                </div>
                <span className="w-full truncate text-center text-xs">{item.name}</span>
              </Link>
            );
          })}
          {fresh.length === 0 ? (
            <div className="flex h-[76px] items-center pl-1 text-sm text-muted">New matches appear here.</div>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Messages</h2>
        {talking.length > 0 ? (
          <ul className="mt-2 divide-y divide-line">
            {talking.map((item) => {
              const unread = isFreshMatch(item.lastMessage, seenSet.has(item.profileId));
              return (
                <li key={item.id}>
                  <Link href={`/messages/${item.slug}`} className="flex items-center gap-3.5 py-3.5">
                    <Avatar item={item} size={60} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("truncate text-[16px]", unread ? "font-semibold" : "font-medium")}>{item.name}</p>
                        {item.verified ? <VerificationBadge label="" className="px-1" /> : null}
                      </div>
                      <p className={cn("mt-0.5 truncate text-sm", unread ? "text-cream" : "text-muted")}>
                        {matchPreview(item.lastMessage)}
                      </p>
                    </div>
                    {unread ? <span className="size-2.5 shrink-0 rounded-full bg-gold" aria-label="Unread" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : visible.length > 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-3xl border border-line p-4">
            <MessageCircle className="size-5 shrink-0 text-gold" />
            <p className="text-sm text-muted">Tap a new match above and say hi. A question about their prompt works best.</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="grid size-20 place-items-center rounded-full border border-gold/40 bg-gold/10">
              <MessageCircle className="size-9 text-gold" />
            </div>
            <p className="mt-5 font-display text-2xl">No chats yet</p>
            <p className="mt-2 max-w-xs text-sm text-muted">{emptyMatchesLine(cityNameBySlug(citySlug))}</p>
            <ul className="mt-5 w-full max-w-xs space-y-2 text-left text-sm text-muted">
              <li>✦ Add 3 or more clear photos</li>
              <li>✦ Answer a prompt — it gives people something to say</li>
              <li>✦ Verify with a selfie for the check mark</li>
            </ul>
            <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
              <Link href="/discover">
                <Button className="w-full" variant="gold">
                  Keep swiping
                </Button>
              </Link>
              <Link href="/studio/profile">
                <Button className="w-full" variant="ghost">
                  Improve my profile
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
