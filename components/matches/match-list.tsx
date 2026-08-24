"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PresenceDot } from "@/components/soko/presence-dot";
import { VerificationBadge } from "@/components/soko/verification-badge";
import { Button } from "@/components/soko/button";
import type { MatchListItem } from "@/lib/likes/list";

export function MatchList({ items }: { items: MatchListItem[] }) {
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="mt-10">
        <p className="text-sm text-muted">No matches yet. A like stays quiet until they like you back.</p>
        <Button className="mt-8 w-full" variant="gold" onClick={() => router.push("/discover")}>
          Discover
        </Button>
      </div>
    );
  }

  return (
    <ul className="mt-8 space-y-3">
      {items.map((item) => (
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
              </div>
              <PresenceDot presence={item.presence} className="mt-1 text-xs" />
              <p className="mt-1 truncate text-sm text-muted">Say hello</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
