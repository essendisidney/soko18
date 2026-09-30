"use client";

import { useEffect, useState } from "react";

type Market = { country_code: string; name: string; status: string };

/** Where you are: sets prices, currency, payment options and the day for your free likes. */
export function CountryPicker() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [country, setCountry] = useState<string>("KE");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/markets")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { country: string; markets: Market[] } } | null) => {
        if (!json?.data) return;
        setMarkets(json.data.markets);
        setCountry(json.data.country);
      })
      .catch(() => {});
  }, []);

  if (markets.length < 2) return null;

  async function change(next: string) {
    setCountry(next);
    const res = await fetch("/api/markets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: next }),
    });
    setNote(res.ok ? "Saved." : "Could not change country.");
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm text-muted">Country</h2>
      <select
        value={country}
        onChange={(e) => void change(e.target.value)}
        className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none [color-scheme:dark]"
      >
        {markets.map((m) => (
          <option key={m.country_code} value={m.country_code}>
            {m.name}
            {m.status === "live" ? "" : " · coming soon"}
          </option>
        ))}
      </select>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
