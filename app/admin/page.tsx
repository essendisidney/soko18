import { StatCard } from "@/components/soko/stat-card";
import Link from "next/link";

const links = [
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/profiles", label: "Profiles" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default function AdminPage() {
  return (
    <main className="min-h-dvh bg-bg px-5 py-6 text-cream md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">SOKO18 Admin</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Overview</h1>

      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Users" value="24,812" />
        <StatCard label="Active today" value="8,412" />
        <StatCard label="Profiles" value="7,231" />
        <StatCard label="Pending review" value="183" />
        <StatCard label="Reports" value="21" />
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-line p-5">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Moderation</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Pending images</dt>
              <dd>183</dd>
            </div>
            <div className="flex justify-between">
              <dt>Reported profiles</dt>
              <dd>21</dd>
            </div>
            <div className="flex justify-between">
              <dt>Flagged accounts</dt>
              <dd>7</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl border border-line p-5">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Revenue</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Today</dt>
              <dd>KES 48,200</dd>
            </div>
            <div className="flex justify-between">
              <dt>This month</dt>
              <dd>KES 1,284,000</dd>
            </div>
          </dl>
        </div>
      </section>

      <nav className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl border border-line bg-glass px-4 py-4 text-sm"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
