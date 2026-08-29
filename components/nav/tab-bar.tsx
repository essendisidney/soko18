"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Grid2x2, Heart, UserRound } from "lucide-react";
import { matchWaitingSnapshot, subscribeMatchWaiting } from "@/lib/matches/waiting";
import { tabActive } from "@/lib/nav/tabs";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/nairobi", label: "Browse", icon: Grid2x2 },
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/me", label: "Me", icon: UserRound },
];

export function TabBar() {
  const pathname = usePathname();
  const waiting = useLocalIds(subscribeMatchWaiting, matchWaitingSnapshot);

  return (
    <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-40 border-t border-line">
      <ul className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
        {tabs.map((tab) => {
          const active = tabActive(tab.href, pathname);
          const Icon = tab.icon;
          const fresh = tab.href === "/matches" && waiting.length > 0 && !active;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 text-[11px] tracking-wide",
                  active ? "text-cream" : "text-muted",
                )}
              >
                <span className="relative">
                  <Icon className={cn("size-[22px]", active && "text-gold")} strokeWidth={active ? 2.2 : 1.7} />
                  {fresh ? (
                    <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-gold" aria-hidden />
                  ) : null}
                </span>
                {tab.label}
                {fresh ? <span className="sr-only">New</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
