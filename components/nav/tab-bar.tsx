"use client";

import { useT } from "@/lib/i18n/use-t";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Compass, Grid2x2, Heart, UserRound } from "lucide-react";
import { RETURN_KEY } from "@/components/nav/remember-return";
import { matchWaitingSnapshot, subscribeMatchWaiting } from "@/lib/matches/waiting";
import { browseTabHref, tabActive } from "@/lib/nav/tabs";
import { citySnapshot, subscribeNearArea } from "@/lib/nairobi/near";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { cn } from "@/lib/utils";

function returnSnapshot() {
  return sessionStorage.getItem(RETURN_KEY);
}

export function TabBar() {
  const pathname = usePathname();
  const waiting = useLocalIds(subscribeMatchWaiting, matchWaitingSnapshot);
  const returnTo = useSyncExternalStore(() => () => {}, returnSnapshot, () => null);
  const storedCity = useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");
  const browseHref = browseTabHref(pathname, storedCity);
  const t = useT();
  const tabs = [
    { href: "/discover", key: "discover", label: t("tab.discover"), icon: Compass },
    { href: browseHref, key: "browse", label: t("tab.browse"), icon: Grid2x2 },
    { href: "/matches", key: "matches", label: t("tab.matches"), icon: Heart },
    { href: "/me", key: "me", label: t("tab.me"), icon: UserRound },
  ];

  return (
    <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-40 border-t border-line">
      <ul className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
        {tabs.map((tab) => {
          const active = tabActive(tab.href, pathname, returnTo);
          const Icon = tab.icon;
          const fresh = tab.href === "/matches" && waiting.length > 0 && !active;
          return (
            <li key={tab.key}>
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
