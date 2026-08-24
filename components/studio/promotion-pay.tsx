"use client";

import { useState } from "react";
import { Button } from "@/components/soko/button";
import {
  formatKes,
  PROMOTION_CATALOG,
  PROMOTION_KINDS,
  type PromotionKind,
} from "@/lib/payments/ledger";

type PendingPay = {
  kind: PromotionKind;
  transactionId: string;
  amountKes: number;
  provider: string;
};

type IntentData = {
  transactionId: string;
  amountKes: number;
  status: string;
  provider: string;
  kind: PromotionKind;
};

export function PromotionBoard({
  kinds,
  live,
}: {
  kinds: readonly PromotionKind[];
  live?: Partial<Record<PromotionKind, boolean>>;
}) {
  const [pending, setPending] = useState<PendingPay | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(kind: PromotionKind) {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/studio/boosts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: IntentData }
      | { error?: { message: string } }
      | null;
    setBusy(false);
    if (!res.ok) {
      setPending(null);
      setNote(json && "error" in json && json.error ? json.error.message : "Sign in to pay.");
      return;
    }
    const data = json && "data" in json ? json.data : null;
    if (!data) {
      setNote("Could not start payment.");
      return;
    }
    setPending({
      kind: data.kind,
      transactionId: data.transactionId,
      amountKes: data.amountKes,
      provider: data.provider,
    });
    setNote(
      data.provider === "sandbox"
        ? `${formatKes(data.amountKes)} · Sandbox. Pay to post the ledger.`
        : `${formatKes(data.amountKes)} · Waiting on M-Pesa.`,
    );
  }

  async function pay() {
    if (!pending || pending.provider !== "sandbox") return;
    setBusy(true);
    const res = await fetch("/api/payments/sandbox/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: pending.transactionId }),
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: { ledgerPosted?: boolean } }
      | { error?: { message: string } }
      | null;
    setBusy(false);
    if (!res.ok) {
      setNote(json && "error" in json && json.error ? json.error.message : "Payment did not settle.");
      return;
    }
    setPending(null);
    setNote("Ledger posted. Placement is live.");
  }

  return (
    <div className="space-y-3">
      {kinds.map((kind) => {
        const item = PROMOTION_CATALOG[kind];
        const isPending = pending?.kind === kind;
        return (
          <section key={kind} className="rounded-3xl border border-line p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="mt-2 text-sm text-muted">
              {item.line} {formatKes(item.amountKes)}.
            </p>
            {live?.[kind] ? <p className="mt-2 text-xs text-gold">{item.title} is live</p> : null}
            <Button className="mt-4" variant="gold" size="sm" disabled={busy} onClick={() => void start(kind)}>
              {item.title}
            </Button>
            {isPending && pending.provider === "sandbox" ? (
              <Button className="mt-3 ml-2" variant="primary" size="sm" disabled={busy} onClick={() => void pay()}>
                Pay sandbox
              </Button>
            ) : null}
          </section>
        );
      })}
      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export function BoostPay({ live }: { live?: boolean }) {
  return <PromotionBoard kinds={["boost"]} live={{ boost: Boolean(live) }} />;
}

export function AllPromotions({ live }: { live?: Partial<Record<PromotionKind, boolean>> }) {
  return <PromotionBoard kinds={PROMOTION_KINDS} live={live} />;
}
