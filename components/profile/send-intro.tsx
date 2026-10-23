"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircleHeart } from "lucide-react";
import { Button } from "@/components/soko/button";
import { PRODUCTS } from "@/lib/payments/catalog";
import { formatKes } from "@/lib/payments/ledger";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Perks = { plan: string | null; salamu?: number };

/** What sending costs this member, in one line. */
export function salamuCostLine(perks: Perks | null) {
  if (!perks) return null;
  if (perks.plan === "platinum") return "Included with Platinum (5 a day).";
  const left = perks.salamu ?? 0;
  if (left > 0) return `Uses 1 Salamu · you have ${left}.`;
  return `A Salamu is ${formatKes(PRODUCTS.salamu_1.amountKes)}, or 5 for ${formatKes(PRODUCTS.salamu_5.amountKes)}.`;
}

/**
 * Salamu: send a short message before matching. Platinum includes 5 a day; anyone else spends a
 * Salamu. It lands in their Likes You; if they like back it becomes your first message.
 * Shown on real member profiles only.
 */
export function SendIntro({ profileId, name }: { profileId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [perks, setPerks] = useState<Perks | null>(null);
  const [state, setState] = useState<{ kind: "idle" | "sent" | "upsell" | "error"; message?: string }>({
    kind: "idle",
  });
  const [busy, setBusy] = useState(false);

  if (!UUID.test(profileId)) return null;

  function start() {
    setOpen(true);
    void fetch("/api/me/entitlements")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Perks } | null) => setPerks(json?.data ?? null))
      .catch(() => {});
  }

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
    return <p className="mt-6 text-sm text-gold">Salamu sent. If {name} likes you back, it becomes your first message.</p>;
  }

  const cost = salamuCostLine(perks);

  return (
    <section className="mt-6">
      {!open ? (
        <Button variant="ghost" className="w-full" onClick={start}>
          <MessageCircleHeart className="size-4" /> Send a Salamu
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
          {cost ? <p className="mt-2 text-xs text-muted">{cost}</p> : null}
          <Button className="mt-3 w-full" variant="gold" disabled={busy || !body.trim()} onClick={() => void send()}>
            Send
          </Button>
        </div>
      )}
      {state.kind === "upsell" ? (
        <p className="mt-2 text-xs text-muted">
          {state.message}{" "}
          <Link href="/upgrade#salamu" className="text-gold">
            Get Salamu
          </Link>
        </p>
      ) : null}
      {state.kind === "error" ? <p className="mt-2 text-xs text-muted">{state.message}</p> : null}
    </section>
  );
}
