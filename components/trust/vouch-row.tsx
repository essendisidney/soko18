"use client";

import { useEffect, useState } from "react";
import { HandHeart } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { vouchLine, type Vouches } from "@/lib/trust/vouches";

/** Rafiki vouches on a profile: who vouched (first names), and a button for verified friends. */
export function VouchRow({ profileId, name }: { profileId: string; name: string }) {
  const { user } = useAuth();
  const [v, setV] = useState<Vouches | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/vouches?profile=${profileId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Vouches } | null) => {
        if (alive && json?.data) setV(json.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [profileId, user]);

  async function toggle() {
    if (!v) return;
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/vouches", {
      method: v.mine ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { data?: Vouches; error?: { message: string } } | null;
    setBusy(false);
    if (json?.data) setV(json.data);
    else setNote(json?.error?.message ?? "That didn’t work. Try again.");
  }

  const line = v ? vouchLine(v) : null;
  if (!v || (!line && !v.canVouch && !v.mine)) return null;

  return (
    <div className="mt-3">
      {line ? (
        <p className="inline-flex items-center gap-1.5 text-sm text-cream/85">
          <HandHeart className="size-4 text-gold" aria-hidden />
          {line}
        </p>
      ) : null}
      {v.mine || v.canVouch ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle()}
          className="mt-2 block rounded-full border border-line px-3 py-1.5 text-xs text-cream/85 disabled:opacity-50"
        >
          {v.mine ? "Withdraw my vouch" : `I know ${name} · vouch for them`}
        </button>
      ) : null}
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </div>
  );
}
