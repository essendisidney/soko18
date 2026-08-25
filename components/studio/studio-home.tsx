"use client";

import Link from "next/link";
import { Button } from "@/components/soko/button";
import { StatCard } from "@/components/soko/stat-card";
import { HealthBar } from "@/components/soko/health-bar";
import { BoostPay } from "@/components/studio/promotion-pay";
import { draftHealth } from "@/lib/profile/health";
import { useDraftProfile } from "@/lib/profile/use-draft";
import { NAIROBI_AREAS } from "@/lib/data/nairobi";
import type { StudioOverview } from "@/lib/studio/overview";

export function StudioHome({
  overview,
  greeting,
}: {
  overview: StudioOverview | null;
  greeting: string;
}) {
  const draft = useDraftProfile();
  const health = overview?.health ?? (draft ? draftHealth(draft) : null);
  const name = overview?.profile?.displayName ?? draft?.displayName;
  const area = draft ? NAIROBI_AREAS.find((a) => a.slug === draft.areaSlug)?.name : null;
  const status = overview?.profile?.status ?? (draft ? (draft.status === "pending_review" ? "In review" : "Draft") : null);

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">SOKO18 Studio</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">
        {name ? `${greeting}, ${name}` : "Your studio"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {overview?.profile
          ? `${overview.profile.status === "live" ? "Live in Nairobi" : status}`
          : draft
            ? `${area ?? "Nairobi"} · ${status}`
            : "Create a profile. It stays a draft until review."}
      </p>

      {overview?.profile ? (
        <div className="mt-8 space-y-3">
          <StatCard label="Profile views" value={String(overview.stats.views)} delta={overview.stats.viewsDelta ?? undefined} />
          <StatCard label="Likes" value={String(overview.stats.likes)} delta={overview.stats.likesDelta ?? undefined} />
          <StatCard
            label="Connections"
            value={String(overview.stats.connections)}
            delta={overview.stats.connectionsDelta ?? undefined}
          />
        </div>
      ) : null}

      {health ? (
        <section className="glass mt-8 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Profile health</h2>
            <span className="font-display text-xl">{health.score}%</span>
          </div>
          <div className="mt-4">
            <HealthBar score={health.score} />
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            {health.checks.map((check) => (
              <li key={check.label} className={check.ok ? "text-cream" : "text-muted"}>
                {check.ok ? "✓" : "✗"} {check.label}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Complete profiles tend to get more engagement. Not a guarantee.
          </p>
          <Link href="/studio/profile" className="mt-4 inline-block">
            <Button size="sm">Improve</Button>
          </Link>
        </section>
      ) : (
        <section className="mt-8 rounded-3xl border border-line p-5">
          <p className="font-display text-2xl">Create a profile</p>
          <p className="mt-2 text-sm text-muted">Nairobi only. Draft until SOKO18 reviews it.</p>
          <Link href="/studio/profile" className="mt-4 inline-block">
            <Button variant="gold" size="sm">
              Create
            </Button>
          </Link>
        </section>
      )}

      <section className="mt-8">
        <h2 className="px-1 text-[11px] tracking-[0.18em] text-muted uppercase">Promote</h2>
        <p className="mt-2 px-1 font-display text-2xl">Boost your profile</p>
        <p className="mt-2 mb-4 px-1 text-sm text-muted">Paid placement. Organic Nairobi Now stays earned.</p>
        <BoostPay live={overview?.boost.active} />
      </section>

      <nav className="mt-10 flex flex-col gap-2 text-sm text-muted">
        <Link href="/studio/analytics">Analytics</Link>
        <Link href="/studio/promotions">Promotions</Link>
        <Link href="/studio/settings">Studio settings</Link>
      </nav>
    </div>
  );
}
