"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plane } from "lucide-react";
import { Button } from "@/components/soko/button";
import { Checkout } from "@/components/payments/checkout";
import { useAuth } from "@/lib/auth/use-auth";
import { kenyaDoorCities, cityNameBySlug } from "@/lib/geo/kenya";
import { shortDate } from "@/lib/diaspora/label";
import { formatMoney } from "@/lib/markets/constants";
import { PRODUCTS } from "@/lib/payments/catalog";
import type { HomeAway } from "@/lib/diaspora/home-away";

const input = "w-full rounded-2xl border border-line bg-glass px-3 py-2.5 text-sm outline-none [color-scheme:dark]";

/** Home & Away and Coming Home, for Kenyans abroad. */
export function HomeAwayPanel() {
  const { user, ready, configured } = useAuth();
  const [data, setData] = useState<HomeAway | null>(null);
  const [city, setCity] = useState("nairobi");
  const [arrives, setArrives] = useState("");
  const [leaves, setLeaves] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const cities = [{ slug: "nairobi", name: "Nairobi" }, ...kenyaDoorCities("nairobi")];

  function load() {
    void fetch("/api/home-away")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: HomeAway } | null) => {
        setData(json?.data ?? null);
        if (json?.data?.homeCity) setCity(json.data.homeCity);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (configured && ready && !user) {
    return (
      <p className="mt-6 text-sm text-muted">
        <Link href="/login?next=/home-away" className="text-gold">
          Sign in
        </Link>{" "}
        to set up Home &amp; Away.
      </p>
    );
  }
  if (!data) return <div className="mt-6 h-40 animate-pulse rounded-3xl bg-white/5" />;

  async function send(body: object, done: string) {
    setBusy(true);
    setNote("");
    const res = await fetch("/api/home-away", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
    setBusy(false);
    if (!res.ok) return setNote(json?.error?.message ?? "Try again.");
    setNote(done);
    load();
  }

  const price = (sku: "home_away_month" | "coming_home_trip") => data.prices.find((p) => p.sku === sku);

  if (!data.abroad) {
    return (
      <section className="mt-6 rounded-3xl border border-line p-5 text-sm text-muted">
        Home &amp; Away is for Kenyans living abroad. They can show up in their home city’s deck, labelled “Lives in the UK · from Nairobi”, or while visiting. You don’t need to do anything.
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-3xl border border-line p-5">
        <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Home city</p>
        <div className="mt-2 flex gap-2">
          <select className={input} value={city} onChange={(e) => setCity(e.target.value)} aria-label="Home city">
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <Button variant="ghost" disabled={busy} onClick={() => void send({ action: "home", city }, "Home city saved.")}>
            Save
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {data.homeAway ? "Home & Away is on: you show in your home city’s deck." : "With Home & Away you show in your home city’s deck while you live abroad."}
        </p>
      </div>

      {!data.marketOpen ? (
        <p className="rounded-2xl border border-gold/40 bg-gold/5 p-3 text-xs text-cream/90">
          Kutana isn’t open for payments in {data.marketName} yet. Home &amp; Away and Coming Home go on sale when it opens.
        </p>
      ) : (
        <div className="space-y-3 rounded-3xl border border-line p-5">
          {price("home_away_month") ? (
            <Checkout sku="home_away_month" label={`${PRODUCTS.home_away_month.title} · ${formatMoney(price("home_away_month")!.amount, price("home_away_month")!.currency)}`} price={price("home_away_month")} providers={["paystack"]} onPaid={load} />
          ) : null}
          {price("coming_home_trip") ? (
            <Checkout sku="coming_home_trip" variant="ghost" label={`${PRODUCTS.coming_home_trip.title} · ${formatMoney(price("coming_home_trip")!.amount, price("coming_home_trip")!.currency)}`} price={price("coming_home_trip")} providers={["paystack"]} onPaid={load} />
          ) : null}
          <p className="text-xs text-muted">Priced in your own currency. Trips are included with Home &amp; Away.</p>
        </div>
      )}

      <div className="rounded-3xl border border-line p-5">
        <p className="flex items-center gap-2 text-[11px] tracking-[0.18em] text-muted uppercase">
          <Plane className="size-3.5" /> Coming Home
        </p>
        {data.trips.map((t) => (
          <div key={t.id} className="mt-3 flex items-center justify-between text-sm">
            <span>
              {cityNameBySlug(t.city)} · {shortDate(t.arrives)}–{shortDate(t.leaves)}
            </span>
            <button type="button" className="text-xs text-muted" disabled={busy} onClick={() => void send({ action: "cancel", id: t.id }, "Trip cancelled.")}>
              Cancel
            </button>
          </div>
        ))}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Arrive
            <input className={`${input} mt-1`} type="date" value={arrives} onChange={(e) => setArrives(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Leave
            <input className={`${input} mt-1`} type="date" value={leaves} onChange={(e) => setLeaves(e.target.value)} />
          </label>
        </div>
        <Button
          className="mt-3 w-full"
          variant="gold"
          disabled={busy || !arrives || !leaves}
          onClick={() => void send({ action: "trip", city, arrives, leaves }, "Trip saved. You’ll show up in the deck 14 days before you land.")}
        >
          Plan trip to {cityNameBySlug(city)}
        </Button>
        <p className="mt-2 text-xs text-muted">
          {data.homeAway ? "Included with Home & Away." : `${data.tripCredits} trip${data.tripCredits === 1 ? "" : "s"} available.`} You’ll be labelled “Visiting from …” with your arrival date.
        </p>
      </div>
      {note ? <p className="text-sm text-gold">{note}</p> : null}
    </section>
  );
}
