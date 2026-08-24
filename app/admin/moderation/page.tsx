"use client";

import Link from "next/link";
import { Button } from "@/components/soko/button";
import { PendingThumb } from "@/components/media/pending-thumb";
import { appendModerationLog, upsertMedia } from "@/lib/media/store";
import { useModerationLog, usePendingQueue } from "@/lib/media/use-queue";
import type { MediaItem, ModerationDecision } from "@/lib/media/types";

export default function ModerationPage() {
  const queue = usePendingQueue();
  const log = useModerationLog();

  async function decide(item: MediaItem, decision: ModerationDecision) {
    const response = await fetch(`/api/admin/moderation/${item.id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const json = (await response.json().catch(() => null)) as { data?: { audited?: boolean } } | null;
    if (!response.ok || !json?.data?.audited) return;

    upsertMedia({
      ...item,
      status: decision === "approve" ? "approved" : "rejected",
    });
    appendModerationLog({
      id: crypto.randomUUID(),
      mediaId: item.id,
      decision,
      note: "",
      at: new Date().toISOString(),
    });
  }

  return (
    <main className="min-h-dvh bg-bg px-5 py-6 md:px-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Moderation</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Pending images</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Nothing publishes until it is approved. Every decision is logged.
      </p>

      {queue.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Queue is clear.</p>
      ) : (
        <ul className="mt-8 max-w-2xl space-y-3">
          {queue.map((item) => (
            <li key={item.id} className="rounded-3xl border border-line p-4">
              <div className="flex items-start gap-4">
                <div className="w-20 shrink-0">
                  <PendingThumb id={item.id} label="Review" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.profileName} · {item.area}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.flagged ? "Scan flagged" : "New upload"} · Nairobi
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="gold" onClick={() => void decide(item, "approve")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void decide(item, "reject")}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {log.length ? (
        <section className="mt-10 max-w-2xl">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Log</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {log.slice(0, 8).map((entry) => (
              <li key={entry.id}>
                {entry.decision} · {entry.mediaId.slice(0, 8)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link href="/admin" className="mt-8 inline-block text-sm text-muted">
        Back to overview
      </Link>
    </main>
  );
}
