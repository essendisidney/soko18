"use client";

import { useT } from "@/lib/i18n/use-t";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Compass, Heart, MessageCircle, UserRound } from "lucide-react";
import { RETURN_KEY } from "@/components/nav/remember-return";
import { matchWaitingSnapshot, subscribeMatchWaiting } from "@/lib/matches/waiting";
import { tabActive } from "@/lib/nav/tabs";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { cn } from "@/lib/utils";

function returnSnapshot() {
  return sessionStorage.getItem(RETURN_KEY);
}

export function TabBar() {
  const pathname = usePathname();
  const waiting = useLocalIds(subscribeMatchWaiting, matchWaitingSnapshot);
  const returnTo = useSyncExternalStore(() => () => {}, returnSnapshot, () => null);
  const t = useT();
  const badges = useBadges(pathname);
  const tabs = [
    { href: "/discover", key: "discover", label: t("tab.discover"), icon: Compass },
    { href: "/likes", key: "likes", label: t("tab.likes"), icon: Heart },
    { href: "/matches", key: "chats", label: t("tab.chats"), icon: MessageCircle },
    { href: "/me", key: "me", label: t("tab.me"), icon: UserRound },
  ];

  return (
    <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-40 border-t border-line">
      <ul className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
        {tabs.map((tab) => {
          const active = tabActive(tab.href, pathname, returnTo);
          const Icon = tab.icon;
          const count = tab.key === "likes" ? badges.likes : tab.key === "chats" ? badges.chats : 0;
          const fresh = tab.href === "/matches" && waiting.length > 0 && !active && count === 0;
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
                  <Icon className={cn("size-[24px] transition-colors", active && "text-gold", active && tab.key === "likes" && "fill-gold")} strokeWidth={active ? 2.2 : 1.7} />
                  {count > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-bg">
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : fresh ? (
                    <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-gold" aria-hidden />
                  ) : null}
                </span>
                {tab.label}
                {count > 0 ? <span className="sr-only">{count} new</span> : fresh ? <span className="sr-only">New</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Likes and unread chats, refreshed on navigation, on focus and every minute. */
function useBadges(pathname: string) {
  const [badges, setBadges] = useState({ likes: 0, chats: 0 });
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/me/badges", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json: { data?: { likes: number; chats: number } } | null) => {
          if (alive && json?.data) setBadges(json.data);
        })
        .catch(() => {});
    void load();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [pathname]);
  return badges;
}
