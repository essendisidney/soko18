"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/soko/button";
import type { MyGifts } from "@/lib/gifts/gifts";

/** Gifts waiting for me: accept, or say no thanks (it goes back to the sender). */
export function GiftInbox() {
  const [data, setData] = useState<MyGifts | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function load() {
    void fetch("/api/gifts")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: MyGifts } | null) => setData(json?.data ?? { received: [], sentThisWeek: 0, weeklyMax: 3 }))
      .catch(() => setData({ received: [], sentThisWeek: 0, weeklyMax: 3 }));
  }
  useEffect(load, []);

  async function respond(id: string, accept: boolean) {
    setBusy(id);
    const res = await fetch("/api/gifts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, accept }) });
    setBusy(null);
    setNote(res.ok ? (accept ? "Accepted. It’s yours." : "Passed back with thanks.") : "Try again.");
    load();
  }

  if (!data) return <div className="mt-6 h-32 animate-pulse rounded-3xl bg-white/5" />;
  if (data.received.length === 0) {
    return (
      <section className="mt-10 flex flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-full border border-gold/40 bg-gold/10">
          <Gift className="size-7 text-gold" />
        </div>
        <p className="mt-4 font-display text-xl">No gifts waiting</p>
        <p className="mt-2 max-w-xs text-sm text-muted">Matches can send you Kutana perks. You can always say no thanks.</p>
        {note ? <p className="mt-3 text-sm text-gold">{note}</p> : null}
      </section>
    );
  }
  return (
    <section className="mt-6 space-y-3">
      {data.received.map((g) => (
        <div key={g.id} className="rounded-3xl border border-gold/50 bg-gold/5 p-4">
          <p className="text-sm">
            <span className="font-medium">{g.from || "A match"}</span> sent you <span className="text-gold">{g.title}</span>
          </p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" variant="gold" disabled={busy === g.id} onClick={() => void respond(g.id, true)}>
              Accept
            </Button>
            <Button className="flex-1" variant="ghost" disabled={busy === g.id} onClick={() => void respond(g.id, false)}>
              No thanks
            </Button>
          </div>
        </div>
      ))}
      {note ? <p className="text-sm text-gold">{note}</p> : null}
    </section>
  );
}
