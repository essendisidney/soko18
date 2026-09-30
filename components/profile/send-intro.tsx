"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/soko/button";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Platinum: send a short message before matching. Shown on real member profiles only. */
export function SendIntro({ profileId, name }: { profileId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sent" | "upsell" | "error"; message?: string }>({
    kind: "idle",
  });
  const [busy, setBusy] = useState(false);

  if (!UUID.test(profileId)) return null;

  async function send() {
    setBusy(true);
    const res = await fetch("/api/intros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, body }),
    });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    if (res.status === 402) return setState({ kind: "upsell", message: json?.error?.message });
    if (!res.ok) return setState({ kind: "error", message: json?.error?.message ?? "Could not send." });
    setState({ kind: "sent" });
  }

  if (state.kind === "sent") {
    return <p className="mt-6 text-sm text-gold">Sent. If {name} likes you back, it becomes your first message.</p>;
  }

  return (
    <section className="mt-6">
      {!open ? (
        <Button variant="ghost" className="w-full" onClick={() => setOpen(true)}>
          Message before matching
        </Button>
      ) : (
        <div className="rounded-3xl border border-line p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder={`Say something about ${name}’s profile`}
            className="w-full rounded-2xl border border-line bg-glass px-3 py-2 text-sm outline-none"
          />
          <Button className="mt-3 w-full" variant="gold" disabled={busy || !body.trim()} onClick={() => void send()}>
            Send
          </Button>
        </div>
      )}
      {state.kind === "upsell" ? (
        <p className="mt-2 text-xs text-muted">
          {state.message}{" "}
          <Link href="/upgrade" className="text-gold">
            Get Platinum
          </Link>
        </p>
      ) : null}
      {state.kind === "error" ? <p className="mt-2 text-xs text-muted">{state.message}</p> : null}
    </section>
  );
}
