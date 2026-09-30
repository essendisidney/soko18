"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/soko/button";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/lib/auth/use-auth";
import { PRODUCTS, type Sku } from "@/lib/payments/catalog";
import { formatKes } from "@/lib/payments/ledger";

const PHONE_KEY = "soko18_mpesa_phone";
const POLL_MS = 3000;
const POLL_LIMIT = 40;

type Phase =
  | { kind: "idle" }
  | { kind: "phone" }
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

export function Checkout({
  sku,
  label,
  variant = "gold",
  onPaid,
}: {
  sku: Sku;
  label?: string;
  variant?: "gold" | "ghost" | "primary";
  onPaid?: () => void;
}) {
  const product = PRODUCTS[sku];
  const { user, ready, configured } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [phone, setPhone] = useState("");
  const [gate, setGate] = useState(false);
  const polls = useRef(0);

  useEffect(() => {
    setPhone(readPhone());
  }, []);

  useEffect(() => {
    if (phase.kind !== "waiting") return;
    polls.current = 0;
    const id = window.setInterval(async () => {
      polls.current += 1;
      const res = await fetch(`/api/payments/status?id=${phase.transactionId}`).catch(() => null);
      const json = (await res?.json().catch(() => null)) as
        | { data?: { status: string; message: string | null } }
        | null;
      const status = json?.data?.status;
      if (status === "completed") {
        window.clearInterval(id);
        setPhase({ kind: "done" });
        onPaid?.();
      } else if (status === "failed") {
        window.clearInterval(id);
        setPhase({ kind: "error", message: "M-Pesa payment was cancelled or failed. Try again." });
      } else if (polls.current >= POLL_LIMIT) {
        window.clearInterval(id);
        setPhase({ kind: "error", message: "Still waiting on M-Pesa. If you paid, it will show up shortly." });
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [phase, onPaid]);

  async function start() {
    if (configured && ready && !user) {
      setGate(true);
      return;
    }
    if (phase.kind !== "phone") {
      setPhase({ kind: "phone" });
      return;
    }
    try {
      localStorage.setItem(PHONE_KEY, phone);
    } catch {}
    setPhase({ kind: "starting" });
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, phone }),
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: { transactionId: string; provider: string } }
      | { error?: { code: string; message: string } }
      | null;
    if (!res.ok || !json || !("data" in json) || !json.data) {
      const message = json && "error" in json && json.error ? json.error.message : "Could not start payment.";
      if (res.status === 401) setGate(true);
      setPhase({ kind: "error", message });
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
      setPhase({ kind: "error", message: "Sandbox payment did not settle." });
      return;
    }
    setPhase({ kind: "done" });
    onPaid?.();
  }

  const price = formatKes(product.amountKes);

  return (
    <div className="mt-4">
      {phase.kind === "phone" || phase.kind === "starting" ? (
        <label className="mb-3 block">
          <span className="text-[11px] tracking-[0.18em] text-muted uppercase">M-Pesa number</span>
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
          Complete test payment · {price}
        </Button>
      ) : phase.kind === "waiting" ? (
        <p className="text-sm text-cream/90">Check your phone and enter your M-Pesa PIN to pay {price}.</p>
      ) : phase.kind === "done" ? (
        <p className="text-sm text-gold">Paid. {product.title} is active.</p>
      ) : (
        <Button
          className="w-full"
          variant={variant}
          disabled={phase.kind === "starting" || (phase.kind === "phone" && phone.replace(/\D/g, "").length < 9)}
          onClick={() => void start()}
        >
          {phase.kind === "phone" || phase.kind === "starting" ? `Pay ${price} with M-Pesa` : (label ?? `${product.title} · ${price}`)}
        </Button>
      )}

      {phase.kind === "error" ? <p className="mt-2 text-xs text-muted">{phase.message}</p> : null}
      {gate ? <AuthGate intent="upgrade" onClose={() => setGate(false)} /> : null}
    </div>
  );
}
