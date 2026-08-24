"use client";

import { Wordmark } from "@/components/brand/wordmark";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="flex items-start justify-between px-1 pt-1">
      <div>
        <Wordmark size="sm" />
        <h1 className="mt-5 font-display text-[34px] leading-none tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex gap-2">
        <Link
          href="/matches"
          aria-label="Notifications"
          className="grid size-10 place-items-center rounded-full border border-line bg-glass"
        >
          <Bell className="size-4" />
        </Link>
        <Link
          href="/me"
          aria-label="Menu"
          className="grid size-10 place-items-center rounded-full border border-line bg-glass"
        >
          <Menu className="size-4" />
        </Link>
      </div>
    </header>
  );
}
