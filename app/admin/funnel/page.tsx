import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/payments/ledger";

export const dynamic = "force-dynamic";

type Funnel = {
  days: number;
  signups: number;
  confirmedAge: number;
  profilesCreated: number;
  profilesLive: number;
  verified: number;
  liked: number;
  matched: number;
  messaged: number;
  checkoutStarted: number;
  paid: number;
  revenueKes: number;
  bySku: Record<string, { count: number; kes: number }>;
};

const STEPS: { key: keyof Funnel; label: string }[] = [
  { key: "signups", label: "Signed up" },
  { key: "confirmedAge", label: "Confirmed 18+ and terms" },
  { key: "profilesCreated", label: "Created a profile" },
  { key: "profilesLive", label: "Profile live" },
  { key: "verified", label: "Selfie verified" },
  { key: "liked", label: "Liked someone" },
  { key: "matched", label: "Got a match" },
  { key: "messaged", label: "Sent a message" },
  { key: "checkoutStarted", label: "Started a payment" },
  { key: "paid", label: "Paid" },
];

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = Math.max(1, Math.min(365, Number((await searchParams).days) || 30));
  const supabase = await createClient();
  const { data } = await supabase.rpc("staff_funnel", { p_days: days });
  const funnel = data as Funnel | null;
  const top = funnel?.signups || 1;

  return (
    <main className="min-h-dvh bg-bg px-5 py-6 md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Growth</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Funnel · last {days} days</h1>
      <p className="mt-2 text-sm text-muted">
        <a href="?days=7" className="mr-3 text-cream/80">7 days</a>
        <a href="?days=30" className="mr-3 text-cream/80">30 days</a>
        <a href="?days=90" className="text-cream/80">90 days</a>
      </p>
      {funnel ? (
        <>
          <ol className="mt-8 max-w-xl space-y-2">
            {STEPS.map((step) => {
              const value = Number(funnel[step.key] ?? 0);
              const pct = Math.round((value / top) * 100);
              return (
                <li key={step.key} className="text-sm">
                  <div className="flex justify-between">
                    <span>{step.label}</span>
                    <span className="text-muted">
                      {value.toLocaleString("en-KE")} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <section className="mt-10 max-w-xl">
            <h2 className="font-display text-2xl">Revenue (M-Pesa, excludes tests)</h2>
            <p className="mt-2 text-3xl">{formatKes(funnel.revenueKes)}</p>
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {Object.entries(funnel.bySku).map(([sku, row]) => (
                <li key={sku} className="flex justify-between">
                  <span>{sku}</span>
                  <span>
                    {row.count} · {formatKes(row.kes)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="mt-8 text-sm text-muted">No data yet.</p>
      )}
    </main>
  );
}
