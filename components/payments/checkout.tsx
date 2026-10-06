"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/soko/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { PRODUCTS, type Sku } from "@/lib/payments/catalog";
import { formatMoney } from "@/lib/markets/constants";
import { useLocale, useT } from "@/lib/i18n/use-t";

const PHONE_KEY = "soko18_mpesa_phone";
const POLL_MS = 3000;
const POLL_LIMIT = 40;

type Method = "mpesa" | "card";

type Phase =
  | { kind: "idle" }
  | { kind: "choose" }
  | { kind: "starting" }
  | { kind: "sandbox"; transactionId: string }
  | { kind: "waiting"; transactionId: string }
  | { kind: "done" }
  | { kind: "error"; message: string };

function readPhone() {
  try {
    return localStorage.getItem(PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

export type LocalPrice = { amount: number; currency: string };

export function Checkout({
  sku,
  label,
  variant = "gold",
  price,
  providers = ["mpesa"],
  resumeId,
  onPaid,
}: {
  sku: Sku;
  label?: string;
  variant?: "gold" | "ghost" | "primary";
  price?: LocalPrice;
  providers?: string[];
  /** Set after returning from a card payment page: poll this transaction. */
  resumeId?: string | null;
  onPaid?: () => void;
}) {
  const product = PRODUCTS[sku];
  const { user, ready, configured } = useAuth();
  const [phase, setPhase] = useState<Phase>(resumeId ? { kind: "waiting", transactionId: resumeId } : { kind: "idle" });
  const [phone, setPhone] = useState("");
  const hasMpesa = providers.includes("mpesa") && (price?.currency ?? "KES") === "KES";
  const [method, setMethod] = useState<Method>(hasMpesa ? "mpesa" : "card");
  const [gate, setGate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const polls = useRef(0);
  const t = useT();
  const locale = useLocale();
  const shown = price ?? { amount: product.amountKes, currency: "KES" };
  const money = formatMoney(shown.amount, shown.currency, locale);

  // Seed from this device once, after hydration (never during server render).
  const mounted = useMounted();
  const [seeded, setSeeded] = useState(false);
  if (mounted && !seeded) {
    setSeeded(true);
    setPhone(readPhone());
  }

  useEffect(() => {
    if (phase.kind !== "waiting") return;
    polls.current = 0;
    const id = window.setInterval(async () => {
      polls.current += 1;
      const res = await fetch(`/api/payments/status?id=${phase.transactionId}`).catch(() => null);
      const json = (await res?.json().catch(() => null)) as { data?: { status: string } } | null;
      const status = json?.data?.status;
      if (status === "completed") {
        window.clearInterval(id);
        setPhase({ kind: "done" });
        onPaid?.();
      } else if (status === "failed") {
        window.clearInterval(id);
        setError("The payment was cancelled or didn’t go through. You can try again.");
        setPhase({ kind: "choose" });
      } else if (polls.current >= POLL_LIMIT) {
        window.clearInterval(id);
        setError("Still waiting on M-Pesa. If you paid, your plan turns on by itself in a minute.");
        setPhase({ kind: "choose" });
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [phase, onPaid]);

  async function start() {
    if (configured && ready && !user) {
      setGate(true);
      return;
    }
    if (phase.kind !== "choose") {
      setPhase({ kind: "choose" });
      return;
    }
    if (method === "mpesa") {
      try {
        localStorage.setItem(PHONE_KEY, phone);
      } catch {}
    }
    setError(null);
    setPhase({ kind: "starting" });
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, phone: method === "mpesa" ? phone : null, method }),
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: { transactionId: string; provider: string; authorizationUrl: string | null } }
      | { error?: { code: string; message: string } }
      | null;
    if (!res.ok || !json || !("data" in json) || !json.data) {
      const message = json && "error" in json && json.error ? json.error.message : "Could not start payment.";
      if (res.status === 401) setGate(true);
      setError(message);
      setPhase({ kind: "choose" });
      return;
    }
    if (json.data.authorizationUrl) {
      window.location.href = json.data.authorizationUrl;
      return;
    }
    setPhase(
      json.data.provider === "sandbox"
        ? { kind: "sandbox", transactionId: json.data.transactionId }
        : { kind: "waiting", transactionId: json.data.transactionId },
    );
  }

  async function settleSandbox(transactionId: string) {
    const res = await fetch("/api/payments/sandbox/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId }),
    });
    if (!res.ok) {
      setError("Test payment did not settle.");
      setPhase({ kind: "choose" });
      return;
    }
    setPhase({ kind: "done" });
    onPaid?.();
  }

  const choosing = phase.kind === "choose" || phase.kind === "starting";
  const canPay = method === "card" || phone.replace(/\D/g, "").length >= 9;

  return (
    <div className="mt-4">
      {choosing && hasMpesa && (providers.includes("paystack") || providers.includes("intasend")) ? (
        <div className="mb-3 flex gap-2 text-sm">
          {(["mpesa", "card"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-full border px-3 py-2 ${method === m ? "border-gold text-cream" : "border-line text-muted"}`}
            >
              {m === "mpesa" ? "M-Pesa" : "Card"}
            </button>
          ))}
        </div>
      ) : null}

      {choosing && method === "mpesa" ? (
        <label className="mb-3 block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">{t("pay.number")}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            className="mt-2 h-12 w-full rounded-full border border-line bg-glass px-4 text-sm outline-none"
          />
        </label>
      ) : null}

      {phase.kind === "sandbox" ? (
        <Button className="w-full" variant="primary" onClick={() => void settleSandbox(phase.transactionId)}>
          Complete test payment · {money}
        </Button>
      ) : phase.kind === "waiting" ? (
        <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4 text-sm">
          <p className="text-cream/90">
            {method === "mpesa" && !resumeId ? `${t("pay.checkPhone")} ${money}.` : "Confirming your payment…"}
          </p>
          <p className="mt-1 text-xs text-muted">This page updates by itself once it’s paid.</p>
          <button type="button" className="mt-3 text-xs text-muted underline" onClick={() => setPhase({ kind: "choose" })}>
            Didn’t get the prompt? Try again
          </button>
        </div>
      ) : phase.kind === "done" ? (
        <div className="rounded-2xl border border-gold/60 bg-gold/10 p-4 text-sm">
          <p className="font-medium text-gold">{t("pay.done")} 🎉</p>
          <div className="mt-3 flex gap-4">
            <Link href="/likes" className="text-cream underline-offset-4 hover:underline">
              See who likes you →
            </Link>
            <Link href="/discover" className="text-muted">
              Back to Discover
            </Link>
          </div>
        </div>
      ) : (
        <Button
          className="w-full"
          variant={variant}
          disabled={phase.kind === "starting" || (choosing && !canPay)}
          onClick={() => void start()}
        >
          {choosing
            ? method === "mpesa"
              ? `${t("pay.with")} · ${money}`
              : `Pay by card · ${money}`
            : (label ?? `${product.title} · ${money}`)}
        </Button>
      )}

      {error ? <p className="mt-2 text-xs text-gold">{error}</p> : null}
      {gate ? <AuthGate intent="upgrade" onClose={() => setGate(false)} /> : null}
    </div>
  );
}
