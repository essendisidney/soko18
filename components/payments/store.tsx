"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { Checkout } from "@/components/payments/checkout";
import {
  BOOST_MINUTES,
  BOOST_SKUS,
  PLAN_FEATURES,
  PLAN_SKUS,
  PRODUCTS,
  SUPER_LIKE_SKUS,
} from "@/lib/payments/catalog";
import { formatKes } from "@/lib/payments/ledger";
import type { Entitlements } from "@/lib/payments/entitlements";

function useEntitlements() {
  const [data, setData] = useState<Entitlements | null>(null);
  const refresh = useCallback(() => {
    void fetch("/api/me/entitlements")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Entitlements } | null) => setData(json?.data ?? null))
      .catch(() => setData(null));
  }, []);
  useEffect(refresh, [refresh]);
  return { data, refresh };
}

function untilLabel(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function Store() {
  const { data, refresh } = useEntitlements();
  const [boostNote, setBoostNote] = useState<string | null>(null);

  async function boostNow() {
    setBoostNote(null);
    const res = await fetch("/api/boost", { method: "POST" });
    const json = (await res.json().catch(() => null)) as
      | { data?: { boostUntil: string } }
      | { error?: { message: string } }
      | null;
    if (!res.ok || !json || !("data" in json) || !json.data) {
      setBoostNote(json && "error" in json && json.error ? json.error.message : "Boost did not start.");
      return;
    }
    const until = new Date(json.data.boostUntil).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
    setBoostNote(`You’re Boosted until ${until}.`);
    refresh();
  }

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">SOKO18</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Get more matches</h1>
      <p className="mt-2 text-sm text-muted">Pay with M-Pesa. No card needed. Plans don’t auto-renew.</p>

      {data ? (
        <section className="mt-6 rounded-3xl border border-line p-5 text-sm">
          <p className="font-display text-xl">
            {data.plan === "platinum" ? "Platinum" : data.plan === "gold" ? "Gold" : "Free"}
            {data.planUntil ? <span className="text-muted"> · until {untilLabel(data.planUntil)}</span> : null}
          </p>
          <p className="mt-2 text-muted">
            {data.likesLeftToday == null ? "Unlimited likes" : `${data.likesLeftToday} likes left today`} ·{" "}
            {data.superLikes} Super Likes · {data.boosts} Boosts
            {data.incognito ? " · Incognito on" : ""}
          </p>
          {data.boosts > 0 ? (
            <Button className="mt-4 w-full" variant="gold" onClick={() => void boostNow()}>
              Boost me now · {BOOST_MINUTES} min
            </Button>
          ) : null}
          {boostNote ? <p className="mt-2 text-xs text-muted">{boostNote}</p> : null}
          <Link href="/likes" className="mt-3 block text-xs text-gold">
            See who likes you →
          </Link>
        </section>
      ) : null}

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Plans</p>
        {PLAN_SKUS.map((sku) => {
          const item = PRODUCTS[sku];
          const tier = item.plan;
          const best = sku === "gold_month";
          return (
            <div key={sku} className={`rounded-3xl border p-5 ${best ? "border-gold" : "border-line"}`}>
              {best ? <p className="text-[11px] tracking-[0.18em] text-gold uppercase">Most popular</p> : null}
              <p className="mt-1 font-display text-2xl">{item.title}</p>
              <p className="mt-1 text-lg">{formatKes(item.amountKes)}</p>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {PLAN_FEATURES[tier].map((line) => (
                  <li key={line}>✓ {line}</li>
                ))}
              </ul>
              <Checkout sku={sku} label={`Get ${item.title}`} variant={best ? "gold" : "ghost"} onPaid={refresh} />
            </div>
          );
        })}
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Boosts</p>
        {BOOST_SKUS.map((sku) => (
          <div key={sku} className="rounded-3xl border border-line p-5">
            <p className="font-display text-2xl">{PRODUCTS[sku].title}</p>
            <p className="mt-2 text-sm text-muted">{PRODUCTS[sku].line}</p>
            <Checkout sku={sku} variant="ghost" onPaid={refresh} />
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Super Likes</p>
        {SUPER_LIKE_SKUS.map((sku) => (
          <div key={sku} className="rounded-3xl border border-line p-5">
            <p className="font-display text-2xl">{PRODUCTS[sku].title}</p>
            <p className="mt-2 text-sm text-muted">{PRODUCTS[sku].line}</p>
            <Checkout sku={sku} variant="ghost" onPaid={refresh} />
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Privacy</p>
        <div className="rounded-3xl border border-line p-5">
          <p className="font-display text-2xl">{PRODUCTS.incognito_month.title}</p>
          <p className="mt-2 text-sm text-muted">{PRODUCTS.incognito_month.line} Included with Platinum.</p>
          <Checkout sku="incognito_month" variant="ghost" onPaid={refresh} />
        </div>
      </section>

      <p className="mt-10 text-xs text-muted">
        SOKO18 is for dating. We never handle money between members. Never send money to someone you met here.
      </p>
    </div>
  );
}
