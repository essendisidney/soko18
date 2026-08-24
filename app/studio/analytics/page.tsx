import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { StatCard } from "@/components/soko/stat-card";
import { Button } from "@/components/soko/button";
import { getStudioOverview } from "@/lib/studio/overview";

export const dynamic = "force-dynamic";

export default async function StudioAnalyticsPage() {
  const result = await getStudioOverview();
  const stats = result.ok ? result.data.stats : null;
  const max = Math.max(1, ...(stats?.series.map((row) => row.views) ?? [0]));

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-6 pb-16">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Studio</p>
      <Wordmark className="mt-2" size="sm" />
      <h1 className="mt-8 font-display text-3xl tracking-tight">Analytics</h1>
      <p className="mt-2 text-sm text-muted">Your numbers only. Last 7 days in Nairobi.</p>
      {stats ? (
        <>
          <div className="mt-8 space-y-3">
            <StatCard label="Profile views" value={String(stats.views)} delta={stats.viewsDelta ?? undefined} />
            <StatCard label="Likes" value={String(stats.likes)} delta={stats.likesDelta ?? undefined} />
            <StatCard
              label="Connections"
              value={String(stats.connections)}
              delta={stats.connectionsDelta ?? undefined}
            />
          </div>
          {stats.series.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Views</h2>
              <ol className="mt-4 flex h-20 items-end gap-1">
                {stats.series.map((row) => (
                  <li
                    key={row.day}
                    className={`flex-1 rounded-sm ${row.views > 0 ? "bg-gold/80" : "bg-line"}`}
                    style={{ height: `${row.views > 0 ? Math.max(12, Math.round((row.views / max) * 100)) : 4}%` }}
                    title={`${row.day} · ${row.views}`}
                  />
                ))}
              </ol>
              {stats.views === 0 ? <p className="mt-3 text-xs text-muted">No views this week.</p> : null}
            </section>
          ) : null}
        </>
      ) : (
        <p className="mt-8 text-sm text-muted">Sign in to see your studio stats.</p>
      )}
      <Link href="/studio" className="mt-10 inline-block">
        <Button variant="ghost" size="sm">
          Back to studio
        </Button>
      </Link>
    </main>
  );
}
