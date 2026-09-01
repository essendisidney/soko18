"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { LOCAL_ACCESS } from "@/lib/payments/catalog";
import { formatKes } from "@/lib/payments/ledger";
import type { AccessKind } from "@/lib/payments/access";
import {
  hasLocalAccess,
  pendingLocalAccess,
  settleLocalAccess,
  startLocalAccess,
} from "@/lib/payments/access-local";

export function LocalPayButton({
  kind,
  idleLabel,
  settledLabel,
  onSettled,
  compact = false,
}: {
  kind: AccessKind;
  idleLabel: string;
  settledLabel: string;
  onSettled?: () => void;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "pending" | "settled">("idle");
  const amount = LOCAL_ACCESS[kind].amountKes;

  useEffect(() => {
    if (hasLocalAccess(kind)) setPhase("settled");
    else if (pendingLocalAccess(kind)) setPhase("pending");
  }, [kind]);

  function click() {
    if (phase === "settled") return;
    if (phase === "pending") {
      const pending = pendingLocalAccess(kind);
      if (pending && settleLocalAccess(pending.id).ok) {
        setPhase("settled");
        onSettled?.();
      }
      return;
    }
    startLocalAccess(kind);
    setPhase("pending");
  }

  const label =
    phase === "settled"
      ? settledLabel
      : phase === "pending"
        ? `${formatKes(amount)} · Settle sandbox`
        : idleLabel;

  if (compact) {
    return (
      <button type="button" className="mt-2 px-1 text-left text-xs text-muted" onClick={click}>
        {label}
      </button>
    );
  }

  return (
    <Button className="mt-3 w-full" variant={phase === "settled" ? "gold" : "ghost"} onClick={click}>
      {label}
    </Button>
  );
}
