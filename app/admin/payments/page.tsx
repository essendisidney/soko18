import Link from "next/link";
import { formatKes } from "@/lib/payments/ledger";
import { listAdminPayments } from "@/lib/admin/payments";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const result = await listAdminPayments();
  const items = result.ok ? result.data.items : [];

  return (
    <main className="min-h-dvh bg-bg px-5 py-6 text-cream md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Admin</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Payments</h1>
      <p className="mt-2 text-sm text-muted">Ledger-backed only. Featured cannot exist without a row.</p>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No ledger payments yet.</p>
      ) : (
        <ul className="mt-8 max-w-2xl space-y-2">
          {items.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm">
              <span className="capitalize">
                {row.purpose} · {row.status}
              </span>
              <span className="text-muted">
                {formatKes(row.amountKes)} · {row.provider}
              </span>
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
