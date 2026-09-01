"use client";

import { useEffect, useState } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { formatRatingSummary, type RatingSummary } from "@/lib/ratings/engine";
import { cn } from "@/lib/utils";

export function RatePanel({
  profileId,
  name,
}: {
  profileId: string;
  name: string;
}) {
  const { user, ready } = useAuth();
  const [score, setScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<RatingSummary>({ average: null, count: 0 });
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    void fetch(`/api/ratings?profileId=${encodeURIComponent(profileId)}`).then(async (res) => {
      if (!res.ok) return;
      const json = (await res.json()) as {
        data?: { summary?: RatingSummary; own?: { score: number } | null };
      };
      if (json.data?.summary) setSummary(json.data.summary);
      if (json.data?.own?.score) setScore(json.data.own.score);
    });
  }, [ready, user, profileId]);

  async function submit(next: number) {
    if (!ready || !user) {
      setGate(true);
      return;
    }
    setScore(next);
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId, score: next }),
    });
    setBusy(false);
    if (res.status === 401) {
      setGate(true);
      return;
    }
    if (!res.ok) {
      setNote("Rate after a match.");
      return;
    }
    const json = (await res.json()) as { data?: { summary?: RatingSummary; line?: string } };
    if (json.data?.summary) setSummary(json.data.summary);
    setNote("Saved. They can see this before they continue.");
  }

  return (
    <section className="mt-6">
      <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Reviews</h2>
      <p className="mt-2 text-sm text-muted">{formatRatingSummary(summary)}</p>
      <p className="mt-1 text-xs text-muted">Rate {name} before you continue.</p>
      <div className="mt-3 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            aria-label={`${n} of 5`}
            onClick={() => void submit(n)}
            className={cn(
              "grid size-10 place-items-center rounded-full border text-sm",
              score === n ? "border-gold bg-gold/20 text-gold" : "border-line text-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {note ? <p className="mt-3 text-xs text-muted">{note}</p> : null}
      {gate ? <AuthGate intent="rate" onClose={() => setGate(false)} /> : null}
    </section>
  );
}
