import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publicCampusBoard } from "@/lib/campus/board";
import { rankRace } from "@/lib/campus/race";
import { nextMilestone, totals, type DayRow } from "@/lib/admin/launch";

export const dynamic = "force-dynamic";

const COLUMNS: { key: keyof DayRow; label: string }[] = [
  { key: "signups", label: "Sign-ups" },
  { key: "went_live", label: "Went live" },
  { key: "students", label: "Students" },
  { key: "invites", label: "Invites used" },
  { key: "likes", label: "Likes" },
  { key: "matches", label: "Matches" },
  { key: "messages", label: "Messages" },
  { key: "paid", label: "Paid" },
  { key: "revenue_kes", label: "KES" },
];

export default async function LaunchPage() {
  const supabase = await createClient();
  const [{ data }, board] = await Promise.all([supabase.rpc("staff_daily", { p_days: 14 }), publicCampusBoard()]);
  const rows = (data as DayRow[] | null) ?? [];
  const sum = totals(rows);
  const race = rankRace(board);
  const leader = race.find((row) => row.status === "live") ?? race[0];

  return (
    <main className="min-h-dvh bg-bg px-5 py-6 md:px-10">
      <Link href="/admin" className="text-xs text-muted">
        ← Admin
      </Link>
      <p className="mt-4 text-[11px] tracking-[0.22em] text-gold uppercase">Launch</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Last 14 days</h1>
      <p className="mt-2 max-w-xl text-sm text-cream/85">Next: {nextMilestone(leader)}</p>

      <section className="mt-6 grid max-w-3xl grid-cols-3 gap-2 md:grid-cols-5">
        {COLUMNS.map((c) => (
          <div key={c.key} className="rounded-2xl border border-line p-3">
            <p className="font-display text-2xl">{Number(sum[c.key as keyof typeof sum] ?? 0).toLocaleString("en-KE")}</p>
            <p className="text-[11px] text-muted">{c.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 max-w-3xl overflow-x-auto">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">By day (Nairobi)</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No data. Is the 00037 migration applied?</p>
        ) : (
          <table className="mt-3 w-full text-right text-sm">
            <thead className="text-[11px] text-muted">
              <tr>
                <th className="py-1 text-left font-normal">Day</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-2 py-1 font-normal">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.day} className="border-t border-line">
                  <td className="py-1.5 text-left text-cream/80">{row.day}</td>
                  {COLUMNS.map((c) => {
                    const v = Number(row[c.key] ?? 0);
                    return (
                      <td key={c.key} className={`px-2 py-1.5 ${v ? "text-cream" : "text-muted/50"}`}>
                        {v ? v.toLocaleString("en-KE") : "·"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8 max-w-xl">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Campuses</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {race.map((row) => (
            <li key={row.slug} className="flex justify-between border-b border-line py-1.5">
              <span>
                {row.shortName} <span className="text-xs text-muted">{row.town}</span>
              </span>
              <span className={row.status === "live" ? "text-gold" : row.joined ? "text-cream" : "text-muted"}>
                {row.status === "live" ? "Open" : `${row.joined} / ${row.target}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
