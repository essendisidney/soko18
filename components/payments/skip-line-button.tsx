"use client";

import { LocalPayButton } from "@/components/payments/local-pay-button";
import { ACCESS_CATALOG } from "@/lib/payments/catalog";
import { formatKes } from "@/lib/payments/ledger";

export function SkipLineButton({
  idleLabel,
  onSettled,
}: {
  idleLabel: string;
  onSettled?: () => void;
}) {
  return (
    <LocalPayButton
      kind="skip"
      idleLabel={idleLabel}
      settledLabel="Review next"
      onSettled={onSettled}
    />
  );
}

export function skipIdleLabel() {
  return `Skip the line · ${formatKes(ACCESS_CATALOG.skip.amountKes)}`;
}
