"use client";

import { Wordmark } from "@/components/brand/wordmark";

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="px-1 pt-1">
      <Wordmark size="sm" />
      <h1 className="mt-5 font-display text-[34px] leading-none tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
    </header>
  );
}
