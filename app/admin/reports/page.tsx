import Link from "next/link";
import { listAdminReports } from "@/lib/admin/reports";
import { LocalSafetyQueue } from "@/components/admin/local-safety-queue";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const result = await listAdminReports();
  const items = result.ok ? result.data.items : [];

  return (
    <main className="min-h-dvh bg-bg px-5 py-6 text-cream md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Admin</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Reports</h1>
      <p className="mt-2 text-sm text-muted">Safety queue. Decide lives on the case, not in this list.</p>
      {items.length === 0 ? <LocalSafetyQueue /> : (
        <ul className="mt-8 max-w-2xl space-y-2">
          {items.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line px-4 py-3 text-sm">
              <p className="capitalize">{row.reason}</p>
              <p className="mt-1 text-xs text-muted">
                {row.targetType} · {row.targetId.slice(0, 8)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link href="/admin" className="mt-8 inline-block text-sm text-muted">
        Back to overview
      </Link>
    </main>
  );
}
