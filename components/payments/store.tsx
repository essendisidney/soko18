"use client";

import { useT } from "@/lib/i18n/use-t";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, Crown, EyeOff, Heart, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/soko/button";
import { Checkout } from "@/components/payments/checkout";
import {
  BOOST_MINUTES,
  BOOST_SKUS,
  PLAN_FEATURES,
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
  const [tier, setTier] = useState<"gold" | "platinum">("gold");
  const [selected, setSelected] = useState<keyof typeof PRODUCTS>("gold_month");
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

  const tierSkus: Record<"gold" | "platinum", (keyof typeof PRODUCTS)[]> = {
    gold: ["gold_month", "gold_week"],
    platinum: ["platinum_month"],
  };
  const skus = tierSkus[tier];
  const chosen = skus.includes(selected) ? selected : skus[0];
  const perWeek = (sku: keyof typeof PRODUCTS) => {
    const p = priceOf(sku);
    const amount = p?.amount ?? PRODUCTS[sku].amountKes;
    const days = ("days" in PRODUCTS[sku] ? (PRODUCTS[sku] as { days?: number }).days : 7) ?? 7;
    return formatMoney(Math.round((amount / days) * 7), p?.currency ?? "KES", locale);
  };
  const saving = (() => {
    const week = priceOf("gold_week")?.amount ?? PRODUCTS.gold_week.amountKes;
    const month = priceOf("gold_month")?.amount ?? PRODUCTS.gold_month.amountKes;
    const pct = Math.round((1 - month / ((week / 7) * 30)) * 100);
    return pct > 0 ? pct : 0;
  })();

  return (
    <div className="pb-8">
      <section
        className={cn(
          "-mx-5 -mt-4 px-5 pt-8 pb-6",
          tier === "platinum"
            ? "bg-linear-to-b from-slate-300/20 via-slate-400/5 to-transparent"
            : "bg-linear-to-b from-gold/25 via-gold/5 to-transparent",
        )}
      >
        <div className="flex items-center gap-2">
          <Crown className={cn("size-6", tier === "platinum" ? "text-slate-200" : "text-gold")} />
          <p className={cn("font-display text-sm tracking-[0.22em] uppercase", tier === "platinum" ? "text-slate-200" : "text-gold")}>
            SOKO {tier === "platinum" ? "Platinum" : "Gold"}
          </p>
        </div>
        <h1 className="mt-3 font-display text-[32px] leading-[1.05] tracking-tight">{t("store.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("store.subtitle")}</p>

        <div className="mt-5 grid grid-cols-2 rounded-full border border-line bg-bg/60 p-1 text-sm">
          {(["gold", "platinum"] as const).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTier(name)}
              className={cn(
                "rounded-full py-2.5 transition-colors",
                tier === name ? (name === "gold" ? "bg-gold text-bg" : "bg-slate-200 text-bg") : "text-muted",
              )}
            >
              {name === "gold" ? "Gold" : "Platinum"}
            </button>
          ))}
        </div>
      </section>

      {resumeId ? <PaymentReturn id={resumeId} onPaid={refresh} /> : null}
      {info && info.market.status !== "live" ? (
        <p className="mt-3 rounded-2xl border border-gold/60 p-3 text-sm">
          SOKO isn’t open in {info.market.name} yet. Prices shown are for when we launch there.
        </p>
      ) : null}

      <ul className="mt-2 space-y-3">
        {PLAN_FEATURES[tier].map((line) => (
          <li key={line} className="flex items-center gap-3 text-[15px]">
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", tier === "platinum" ? "bg-slate-200/15" : "bg-gold/15")}>
              <Check className={cn("size-4", tier === "platinum" ? "text-slate-200" : "text-gold")} />
            </span>
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-3">
        {skus.map((sku) => {
          const item = PRODUCTS[sku];
          const on = sku === chosen;
          const best = sku === "gold_month";
          return (
            <button
              key={sku}
              type="button"
              onClick={() => setSelected(sku)}
              className={cn(
                "relative flex w-full items-center justify-between rounded-3xl border p-4 text-left transition-colors",
                on ? (tier === "platinum" ? "border-slate-200 bg-slate-200/5" : "border-gold bg-gold/5") : "border-line",
              )}
            >
              {best && saving > 0 ? (
                <span className="absolute -top-2.5 right-4 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-semibold text-bg">
                  {t("store.popular")} · Save {saving}%
                </span>
              ) : null}
              <div>
                <p className="font-display text-lg">{item.title.split(" · ")[1] ?? item.title}</p>
                <p className="mt-0.5 text-xs text-muted">{perWeek(sku)} / week</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-display text-xl">{show(sku)}</p>
                <span className={cn("grid size-5 place-items-center rounded-full border", on ? "border-gold bg-gold" : "border-line")}>
                  {on ? <span className="size-2 rounded-full bg-bg" /> : null}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-24 z-10 -mx-1 mt-4 rounded-3xl bg-bg/90 px-1 pb-1 backdrop-blur-xl">
        <Checkout
          key={chosen}
          sku={chosen}
          label={`Continue · ${show(chosen)}`}
          variant={tier === "platinum" ? "primary" : "gold"}
          price={priceOf(chosen)}
          providers={providers}
          onPaid={refresh}
        />
        <p className="mt-2 text-center text-[11px] text-muted">One-off payment. Doesn’t auto-renew. Pay with M-Pesa or card.</p>
      </div>

      {data ? (
        <section className="mt-8 rounded-3xl border border-line p-5 text-sm">
          <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Your plan</p>
          <p className="mt-2 font-display text-xl">
            {data.plan === "platinum" ? "Platinum" : data.plan === "gold" ? "Gold" : "Free"}
            {data.planUntil ? <span className="text-muted"> · until {untilLabel(data.planUntil)}</span> : null}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Meter icon={<Heart className="size-4 text-rose-400" />} value={data.likesLeftToday == null ? "∞" : String(data.likesLeftToday)} label="Likes today" />
            <Meter icon={<Star className="size-4 fill-sky-400 text-sky-400" />} value={String(data.superLikes)} label="Super Likes" />
            <Meter icon={<Zap className="size-4 fill-violet-400 text-violet-400" />} value={String(data.boosts)} label="Boosts" />
          </div>
          {data.boosts > 0 ? (
            <Button className="mt-4 w-full" variant="gold" onClick={() => void boostNow()}>
              {t("store.boostNow")} · {BOOST_MINUTES} min
            </Button>
          ) : null}
          {boostNote ? <p className="mt-2 text-xs text-muted">{boostNote}</p> : null}
        </section>
      ) : null}

      <section id="boost" className="mt-10 scroll-mt-6">
        <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Top up</h2>
        <div className="mt-3 space-y-3">
          <TopUp
            icon={<Zap className="size-5 fill-violet-400 text-violet-400" />}
            tint="bg-violet-400/10"
            title="Boost"
            line={PRODUCTS.boost_1.line}
          >
            {BOOST_SKUS.map((sku) => (
              <Checkout key={sku} sku={sku} label={`${PRODUCTS[sku].title} · ${show(sku)}`} variant="ghost" price={priceOf(sku)} providers={providers} onPaid={refresh} />
            ))}
          </TopUp>
          <TopUp
            icon={<Star className="size-5 fill-sky-400 text-sky-400" />}
            tint="bg-sky-400/10"
            title="Super Likes"
            line={PRODUCTS.super_1.line}
          >
            {SUPER_LIKE_SKUS.map((sku) => (
              <Checkout key={sku} sku={sku} label={`${PRODUCTS[sku].title} · ${show(sku)}`} variant="ghost" price={priceOf(sku)} providers={providers} onPaid={refresh} />
            ))}
          </TopUp>
          <TopUp
            icon={<EyeOff className="size-5 text-cream" />}
            tint="bg-white/10"
            title="Incognito"
            line={`${PRODUCTS.incognito_month.line} Included with Platinum.`}
          >
            <Checkout sku="incognito_month" label={`30 days · ${show("incognito_month")}`} variant="ghost" price={priceOf("incognito_month")} providers={providers} onPaid={refresh} />
          </TopUp>
        </div>
      </section>

      <p className="mt-10 text-xs text-muted">{t("store.safetyNote")}</p>
    </div>
  );
}

function Meter({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line py-3">
      <div className="flex justify-center">{icon}</div>
      <p className="mt-1 font-display text-xl">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function TopUp({
  icon,
  tint,
  title,
  line,
  children,
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  line: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-line p-4">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tint)}>{icon}</span>
        <div>
          <p className="font-display text-lg">{title}</p>
          <p className="text-xs text-muted">{line}</p>
        </div>
      </div>
      <div className="-mt-1">{children}</div>
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
