import Link from "next/link";
import { Button } from "@/components/soko/button";
import { StatCard } from "@/components/soko/stat-card";
import { Wordmark } from "@/components/brand/wordmark";
import { getProfile } from "@/lib/data/seed";
import { profileHealth } from "@/lib/profile/health";

export default function StudioPage() {
  const amani = getProfile("amani-nairobi");
  const health = amani ? profileHealth(amani) : { score: 0, checks: [] };

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-6 pb-16">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">SOKO18 Studio</p>
      <Wordmark className="mt-2" />
      <h1 className="mt-8 font-display text-3xl tracking-tight">Good afternoon, Amani</h1>
      <p className="mt-2 text-sm text-muted">Kilimani · Nairobi</p>

      <div className="mt-8 grid grid-cols-1 gap-3">
        <StatCard label="Profile views" value="4,821" delta="↑ 18%" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Likes" value="386" delta="↑ 24%" />
          <StatCard label="Connections" value="104" delta="↑ 12%" />
        </div>
      </div>

      <section className="glass mt-8 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Profile quality</h2>
          <span className="font-display text-xl">{health.score}%</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gold" style={{ width: `${health.score}%` }} />
        </div>
        <ul className="mt-4 space-y-1.5 text-sm">
          {health.checks.map((check) => (
            <li key={check.label} className={check.ok ? "text-cream" : "text-muted"}>
              {check.ok ? "✓" : "✗"} {check.label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Profiles with complete information tend to receive more engagement. This is not a guarantee.
        </p>
        <Link href="/studio/profile" className="mt-4 inline-block">
          <Button size="sm">Improve profile</Button>
        </Link>
      </section>

      <section className="mt-8 rounded-3xl border border-line p-5">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Promote</h2>
        <p className="mt-2 font-display text-2xl">Boost · Spotlight · Featured</p>
        <p className="mt-2 text-sm text-muted">Pay for visibility. Organic Nairobi Now stays earned.</p>
        <Link href="/studio/promotions" className="mt-4 inline-block">
          <Button variant="gold" size="sm">
            Boost
          </Button>
        </Link>
      </section>

      <nav className="mt-10 flex flex-col gap-2 text-sm text-muted">
        <Link href="/studio/analytics">Analytics</Link>
        <Link href="/studio/settings">Studio settings</Link>
        <Link href="/nairobi">Nairobi</Link>
      </nav>
    </main>
  );
}
