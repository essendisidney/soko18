"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Grid2x2, Heart, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/nairobi", label: "Browse", icon: Grid2x2 },
  { href: "/matches", label: "Matches", icon: Heart },
  { href: "/me", label: "Me", icon: UserRound },
];

function tabActive(href: string, pathname: string) {
  if (href === "/nairobi") {
    return (
      pathname === "/nairobi" ||
      pathname.startsWith("/nairobi/") ||
      pathname === "/browse" ||
      pathname.startsWith("/category/") ||
      pathname === "/kisumu" ||
      pathname.startsWith("/kisumu/") ||
      pathname.startsWith("/city/")
    );
  }
  if (href === "/me") {
    return (
      pathname === "/me" ||
      pathname.startsWith("/me/") ||
      pathname === "/saved" ||
      pathname.startsWith("/saved/") ||
      pathname === "/settings" ||
      pathname.startsWith("/settings/") ||
      pathname === "/studio" ||
      pathname.startsWith("/studio/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom glass fixed inset-x-0 bottom-0 z-40 border-t border-line">
      <ul className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
        {tabs.map((tab) => {
          const active = tabActive(tab.href, pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 text-[11px] tracking-wide",
                  active ? "text-cream" : "text-muted",
                )}
              >
                <Icon className={cn("size-[22px]", active && "text-gold")} strokeWidth={active ? 2.2 : 1.7} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
