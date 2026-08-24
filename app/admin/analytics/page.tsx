import Link from "next/link";
import { StatCard } from "@/components/soko/stat-card";
import { getAdminAnalytics } from "@/lib/admin/analytics";
import { formatKes } from "@/lib/payments/ledger";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const result = await getAdminAnalytics();
  const stats = result.ok
    ? result.data
    : {
        impressionsToday: 0,
        likesToday: 0,
        matchesToday: 0,
        revenueTodayKes: 0,
        revenueMonthKes: 0,
      };

  return (
    <main className="min-h-dvh bg-bg px-5 py-6 text-cream md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Admin</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Analytics</h1>
      <p className="mt-2 text-sm text-muted">Real events only. Revenue is ledger payment debits.</p>

      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Impressions today" value={String(stats.impressionsToday)} />
        <StatCard label="Likes today" value={String(stats.likesToday)} />
        <StatCard label="Matches today" value={String(stats.matchesToday)} />
        <StatCard label="Revenue today" value={formatKes(stats.revenueTodayKes)} />
        <StatCard label="Revenue this month" value={formatKes(stats.revenueMonthKes)} />
      </section>

      <Link href="/admin" className="mt-8 inline-block text-sm text-muted">
        Back to overview
      </Link>
    </main>
  );
}
