"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/soko/button";
import {
  dropSearchNotify,
  notifyLabel,
  searchNotifySnapshot,
  subscribeSearchNotify,
} from "@/lib/browse/search-notify";
import { useLocalIds } from "@/lib/safety/use-id-list";

export default function NotifyPage() {
  const items = useLocalIds(subscribeSearchNotify, searchNotifySnapshot);

  return (
    <div>
      <h1 className="font-display text-[34px] tracking-tight">Notify me</h1>
      <p className="mt-2 text-sm text-muted">On this device. No invented people.</p>

      {items.length === 0 ? (
        <div className="mt-10">
          <p className="text-sm text-muted">Nothing waiting.</p>
          <Link href="/discover" className="mt-6 inline-block">
            <Button variant="gold">Discover</Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-8 overflow-hidden rounded-3xl border border-line">
          {items.map((key) => (
            <li
              key={key}
              className="flex items-center justify-between border-b border-line px-5 py-4 last:border-b-0"
            >
              <p className="min-w-0 truncate pr-3">{notifyLabel(key)}</p>
              <button
                type="button"
                aria-label={`Remove ${notifyLabel(key)}`}
                className="grid size-8 shrink-0 place-items-center rounded-full text-cream/80"
                onClick={() => dropSearchNotify(key)}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
