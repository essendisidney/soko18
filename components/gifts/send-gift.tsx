"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/soko/button";
import { Checkout } from "@/components/payments/checkout";
import { formatKes } from "@/lib/payments/ledger";
import { GIFT_SKUS, PRODUCTS } from "@/lib/payments/catalog";

type GiftSku = (typeof GIFT_SKUS)[number];

/** Send a match a Kutana perk. They can accept it or say no thanks (then it comes back to you). */
export function SendGift({ profileId, name }: { profileId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<{ sku: GiftSku; giftId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  async function choose(sku: GiftSku) {
    setBusy(true);
    setNote("");
    const res = await fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, sku }),
    });
    const json = (await res.json().catch(() => null)) as { data?: { giftId: string }; error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok || !json?.data) return setNote(json?.error?.message ?? "Try again.");
    setChosen({ sku, giftId: json.data.giftId });
  }

  if (sent) return <p className="mt-4 text-sm text-gold">Gift sent. {name} can accept it or pass it back to you.</p>;

  return (
    <section className="mt-4">
      {!open ? (
        <Button variant="ghost" className="w-full" onClick={() => setOpen(true)}>
          <Gift className="size-4" /> Send {name} a gift
        </Button>
      ) : (
        <div className="space-y-2 rounded-3xl border border-line p-4">
          {chosen ? (
            <Checkout sku={chosen.sku} giftId={chosen.giftId} open label={`${PRODUCTS[chosen.sku].title} · ${formatKes(PRODUCTS[chosen.sku].amountKes)}`} onPaid={() => setSent(true)} />
          ) : (
            GIFT_SKUS.map((sku) => (
              <Button key={sku} variant="ghost" className="w-full justify-between" disabled={busy} onClick={() => void choose(sku)}>
                <span>{PRODUCTS[sku].title.replace("Gift: ", "")}</span>
                <span className="text-muted">{formatKes(PRODUCTS[sku].amountKes)}</span>
              </Button>
            ))
          )}
          <p className="text-xs text-muted">Kutana perks only, never cash or airtime. Up to 3 gifts a week.</p>
        </div>
      )}
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
