import Link from "next/link";
import { CostForm } from "@/components/admin/cost-form";
import { breakEven, monthParam, type Economics } from "@/lib/admin/economics";
import { formatMoney } from "@/lib/markets/constants";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function shiftMonth(month: string, by: number) {
  const d = new Date(`${month}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 7);
}

const kes = (n: number) => formatMoney(Math.round(n), "KES");

export default async function EconomicsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_economics", { p_month: monthParam(month) });

  if (error || !data) {
    return (
      <main className="min-h-dvh bg-bg px-5 py-6 md:px-10">
        <h1 className="font-display text-3xl">Economics</h1>
        <p className="mt-4 text-sm text-muted">Admins only.</p>
      </main>
    );
  }

  const e = data as Economics;
  const be = breakEven(e);
  const current = Object.fromEntries(e.costs.map((c) => [c.category, Number(c.amountKes)]));
  const label = new Date(`${e.month}T00:00:00Z`).toLocaleDateString("en-KE", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <main className="min-h-dvh bg-bg px-5 py-6 md:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl">Economics · {label}</h1>
        <nav className="flex gap-4 text-sm text-muted">
          <Link href={`/admin/economics?month=${shiftMonth(e.month, -1)}`}>← Previous</Link>
          <Link href={`/admin/economics?month=${shiftMonth(e.month, 1)}`}>Next →</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
      <p className="mt-2 text-xs text-muted">
        Settled real payments only (no sandbox, no test accounts), by market and currency. Currencies are never added together.
        {e.feesRecorded ? " Net is after recorded payment fees." : " No payment fees are recorded in the ledger yet, so net equals gross."}
      </p>

      <section className="mt-6">
        <h2 className="text-sm text-muted">Revenue</h2>
        {e.revenue.length === 0 ? (
          <p className="mt-2 text-sm">No real payments this month yet.</p>
        ) : (
          <table className="mt-2 w-full max-w-3xl text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1">Market</th>
                <th>Gross</th>
                <th>Fees</th>
                <th>Net</th>
                <th>Payments</th>
                <th>Paying members</th>
              </tr>
            </thead>
            <tbody>
              {e.revenue.map((r) => (
                <tr key={`${r.country}-${r.currency}`} className="border-t border-line">
                  <td className="py-1.5">{r.country}</td>
                  <td>{formatMoney(Number(r.gross), r.currency)}</td>
                  <td>{formatMoney(Number(r.fees), r.currency)}</td>
                  <td>{formatMoney(Number(r.net), r.currency)}</td>
                  <td>{r.payments}</td>
                  <td>{r.payers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Paying members" value={String(e.payingMembers)} />
        <Stat label="Active (30 days)" value={String(e.activeMembers)} />
        <Stat label="Paying share" value={be.payingShare === null ? "—" : `${(be.payingShare * 100).toFixed(1)}%`} />
        <Stat label="Net ARPPU (KES)" value={be.arppu === null ? "—" : kes(be.arppu)} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm text-muted">Costs this month (KES)</h2>
        <CostForm month={e.month} current={current} />
      </section>

      <section className="mt-8 max-w-3xl rounded-3xl border border-line p-5">
        <h2 className="text-sm text-muted">Break-even (Kenya, KES)</h2>
        {e.costsKes <= 0 ? (
          <p className="mt-2 text-sm">Enter this month’s costs to see break-even.</p>
        ) : be.payersNeeded === null ? (
          <p className="mt-2 text-sm">Costs {kes(e.costsKes)}. Break-even needs real KES payments to divide by.</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <Stat label="Costs" value={kes(e.costsKes)} />
            <Stat label="Net KES revenue" value={kes(e.netKes)} />
            <Stat label="Covered?" value={be.covered ? "Yes" : "Not yet"} />
            <Stat label="Paying members needed" value={`${be.payersNeeded} (now ${e.payingMembersKes})`} />
            <Stat label="Active members needed" value={be.membersNeeded === null ? "—" : `${be.membersNeeded} (now ${e.activeMembers})`} />
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}
