"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";

type Info = { country: string; market: { name: string; status: string } };

/** Visitors from a country we haven't launched in can join that country's waitlist (real counts only). */
export function MarketBanner() {
  const [info, setInfo] = useState<Info | null>(null);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    void fetch("/api/prices")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Info } | null) => setInfo(json?.data ?? null))
      .catch(() => {});
  }, []);

  if (!info || info.market.status !== "waitlist") return null;

  async function join() {
    const res = await fetch("/api/markets/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: info!.country, email }),
    });
    if (res.ok) setJoined(true);
  }

  return (
    <div className="glass relative z-10 mt-6 w-full max-w-sm rounded-2xl p-4 text-left text-sm">
      <p>SOKO18 is coming to {info.market.name}.</p>
      {joined ? (
        <p className="mt-2 text-gold">You’re on the list. We’ll email you when we open.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="h-10 min-w-0 flex-1 rounded-full border border-line bg-glass px-3 text-sm outline-none"
          />
          <Button size="sm" variant="gold" disabled={!email.includes("@")} onClick={() => void join()}>
            Notify me
          </Button>
        </div>
      )}
    </div>
  );
}
