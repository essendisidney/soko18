"use client";

import { useT } from "@/lib/i18n/use-t";

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
import { formatMoney } from "@/lib/markets/constants";
import { useLocale } from "@/lib/i18n/use-t";
import { useSearchParams } from "next/navigation";
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

type PriceInfo = {
  country: string;
  market: { name: string; status: string; currency: string; providers: string[] };
  prices: { sku: string; amount: number; currency: string }[];
};

function usePrices() {
  const [info, setInfo] = useState<PriceInfo | null>(null);
  useEffect(() => {
    void fetch("/api/prices")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: PriceInfo } | null) => setInfo(json?.data ?? null))
      .catch(() => {});
  }, []);
  return info;
}

export function Store() {
  const { data, refresh } = useEntitlements();
  const info = usePrices();
  const locale = useLocale();
  const resumeId = useSearchParams().get("paid");
  const priceOf = (sku: string) => {
    const hit = info?.prices.find((p) => p.sku === sku);
    return hit ? { amount: hit.amount, currency: hit.currency } : undefined;
  };
  const providers = info?.market.providers ?? ["mpesa"];
  const show = (sku: keyof typeof PRODUCTS) => {
    const p = priceOf(sku);
    return p ? formatMoney(p.amount, p.currency, locale) : formatMoney(PRODUCTS[sku].amountKes, "KES", locale);
  };
  const [boostNote, setBoostNote] = useState<string | null>(null);
  const t = useT();

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
      <h1 className="mt-3 font-display text-3xl tracking-tight">{t("store.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("store.subtitle")}</p>
      {resumeId ? <PaymentReturn id={resumeId} onPaid={refresh} /> : null}
      {info && info.market.status !== "live" ? (
        <p className="mt-3 rounded-2xl border border-gold/60 p-3 text-sm">
          SOKO18 isn’t open in {info.market.name} yet. Prices shown are for when we launch there.
        </p>
      ) : null}

      {data ? (
        <section className="mt-6 rounded-3xl border border-line p-5 text-sm">
          <p className="font-display text-xl">
            {data.plan === "platinum" ? "Platinum" : data.plan === "gold" ? "Gold" : "Free"}
            {data.planUntil ? <span className="text-muted"> · until {untilLabel(data.planUntil)}</span> : null}
          </p>
          <p className="mt-2 text-muted">
            {data.likesLeftToday == null ? t("store.unlimited") : `${data.likesLeftToday} ${t("store.likesLeft")}`} ·{" "}
            {data.superLikes} Super Likes · {data.boosts} Boosts
            {data.incognito ? " · Incognito on" : ""}
          </p>
          {data.boosts > 0 ? (
            <Button className="mt-4 w-full" variant="gold" onClick={() => void boostNow()}>
              {t("store.boostNow")} · {BOOST_MINUTES} min
            </Button>
          ) : null}
          {boostNote ? <p className="mt-2 text-xs text-muted">{boostNote}</p> : null}
          <Link href="/likes" className="mt-3 block text-xs text-gold">
            {t("store.seeLikes")}
          </Link>
        </section>
      ) : null}

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">{t("store.plans")}</p>
        {PLAN_SKUS.map((sku) => {
          const item = PRODUCTS[sku];
          const tier = item.plan;
          const best = sku === "gold_month";
          return (
            <div key={sku} className={`rounded-3xl border p-5 ${best ? "border-gold" : "border-line"}`}>
              {best ? <p className="text-[11px] tracking-[0.18em] text-gold uppercase">{t("store.popular")}</p> : null}
              <p className="mt-1 font-display text-2xl">{item.title}</p>
              <p className="mt-1 text-lg">{show(sku)}</p>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {PLAN_FEATURES[tier].map((line) => (
                  <li key={line}>✓ {line}</li>
                ))}
              </ul>
              <Checkout
                sku={sku}
                label={`Get ${item.title} · ${show(sku)}`}
                variant={best ? "gold" : "ghost"}
                price={priceOf(sku)}
                providers={providers}
                onPaid={refresh}
              />
            </div>
          );
        })}
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">{t("store.boosts")}</p>
        {BOOST_SKUS.map((sku) => (
          <div key={sku} className="rounded-3xl border border-line p-5">
            <p className="font-display text-2xl">{PRODUCTS[sku].title}</p>
            <p className="mt-2 text-sm text-muted">{PRODUCTS[sku].line}</p>
            <Checkout
              sku={sku}
              label={`${PRODUCTS[sku].title} · ${show(sku)}`}
              variant="ghost"
              price={priceOf(sku)}
              providers={providers}
              onPaid={refresh}
            />
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">{t("store.superLikes")}</p>
        {SUPER_LIKE_SKUS.map((sku) => (
          <div key={sku} className="rounded-3xl border border-line p-5">
            <p className="font-display text-2xl">{PRODUCTS[sku].title}</p>
            <p className="mt-2 text-sm text-muted">{PRODUCTS[sku].line}</p>
            <Checkout
              sku={sku}
              label={`${PRODUCTS[sku].title} · ${show(sku)}`}
              variant="ghost"
              price={priceOf(sku)}
              providers={providers}
              onPaid={refresh}
            />
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">{t("store.privacy")}</p>
        <div className="rounded-3xl border border-line p-5">
          <p className="font-display text-2xl">{PRODUCTS.incognito_month.title}</p>
          <p className="mt-2 text-sm text-muted">{PRODUCTS.incognito_month.line} Included with Platinum.</p>
          <Checkout
            sku="incognito_month"
            label={`${PRODUCTS.incognito_month.title} · ${show("incognito_month")}`}
            variant="ghost"
            price={priceOf("incognito_month")}
            providers={providers}
            onPaid={refresh}
          />
        </div>
      </section>

      <p className="mt-10 text-xs text-muted">
        {t("store.safetyNote")}
      </p>
    </div>
  );
}

/** Back from a card payment page: confirm with the ledger before celebrating. */
function PaymentReturn({ id, onPaid }: { id: string; onPaid: () => void }) {
  const [state, setState] = useState<"waiting" | "done" | "failed">("waiting");
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(async () => {
      tries += 1;
      const res = await fetch(`/api/payments/status?id=${id}`).catch(() => null);
      const json = (await res?.json().catch(() => null)) as { data?: { status: string } } | null;
      if (json?.data?.status === "completed") {
        window.clearInterval(timer);
        setState("done");
        onPaid();
      } else if (json?.data?.status === "failed" || tries > 30) {
        window.clearInterval(timer);
        setState("failed");
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [id, onPaid]);
  return (
    <p className="mt-3 rounded-2xl border border-line p-3 text-sm">
      {state === "waiting"
        ? "Confirming your payment…"
        : state === "done"
          ? "Paid. Your purchase is active."
          : "We couldn’t confirm that payment. If you were charged, it will show up shortly."}
    </p>
  );
}
