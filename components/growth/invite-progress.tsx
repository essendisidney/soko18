"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Gift, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { whatsappInviteUrl } from "@/lib/growth/referral";
import type { InviteSummary } from "@/app/api/invites/route";

/** Me: what inviting has earned so far (real counts) and a one-tap WhatsApp invite. */
export function InviteProgress() {
  const { user, ready } = useAuth();
  const [summary, setSummary] = useState<InviteSummary | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    void fetch("/api/invites", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: InviteSummary } | null) => setSummary(json?.data ?? null))
      .catch(() => {});
  }, [ready, user]);

  const days = summary?.rewardDays ?? 7;
  const line = !summary
    ? `${days} days of Gold for every friend who goes live.`
    : summary.approved > 0
      ? `${summary.approved} ${summary.approved === 1 ? "friend" : "friends"} live · ${summary.goldDaysEarned} Gold days earned`
      : summary.invited > 0
        ? `${summary.invited} joined. You get ${days} days of Gold when each one goes live.`
        : `${days} days of Gold for every friend who goes live.`;

  return (
    <div className="mt-3 rounded-3xl border border-line p-4">
      <Link href="/invite" className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/15">
          <Gift className="size-5 text-gold" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Invite friends, get Gold</p>
          <p className="mt-0.5 text-sm text-muted">{line}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" />
      </Link>
      {summary?.code ? (
        <a
          href={whatsappInviteUrl(window.location.origin, summary.code)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-medium text-[#062b14]"
        >
          <MessageCircle className="size-4" /> Invite on WhatsApp
        </a>
      ) : null}
    </div>
  );
}
