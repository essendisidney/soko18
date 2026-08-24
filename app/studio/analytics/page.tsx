import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { StatCard } from "@/components/soko/stat-card";
import { Button } from "@/components/soko/button";
import { getStudioOverview } from "@/lib/studio/overview";

export const dynamic = "force-dynamic";

export default async function StudioAnalyticsPage() {
  const result = await getStudioOverview();
  const stats = result.ok ? result.data.stats : null;

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-6 pb-16">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Studio</p>
      <Wordmark className="mt-2" size="sm" />
      <h1 className="mt-8 font-display text-3xl tracking-tight">Analytics</h1>
      <p className="mt-2 text-sm text-muted">Your numbers only.</p>
      {stats ? (
        <div className="mt-8 space-y-3">
          <StatCard label="Profile views" value={String(stats.views)} delta={stats.viewsDelta ?? undefined} />
          <StatCard label="Likes" value={String(stats.likes)} delta={stats.likesDelta ?? undefined} />
          <StatCard label="Connections" value={String(stats.connections)} delta={stats.connectionsDelta ?? undefined} />
        </div>
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
