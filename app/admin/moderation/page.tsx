import { Button } from "@/components/soko/button";
import Link from "next/link";

const queue = [
  { id: "m-183", name: "Amani", city: "Kisumu", reason: "New upload" },
  { id: "m-182", name: "Chebet", city: "Eldoret", reason: "Replacement requested" },
  { id: "m-181", name: "Nia", city: "Nairobi", reason: "Scan flagged" },
];

export default function ModerationPage() {
  return (
    <main className="min-h-dvh bg-bg px-5 py-6 md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Moderation</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Pending images</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Nothing publishes until it is approved. Every decision is logged.
      </p>
      <ul className="mt-8 max-w-2xl space-y-3">
        {queue.map((item) => (
          <li key={item.id} className="rounded-3xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {item.name} · {item.city}
                </p>
                <p className="mt-1 text-sm text-muted">{item.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="gold">
                  Approve
                </Button>
                <Button size="sm" variant="ghost">
                  Reject
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/admin" className="mt-8 inline-block text-sm text-muted">
        Back to overview
      </Link>
    </main>
  );
}
