"use client";

import Link from "next/link";
import { Checkout } from "@/components/payments/checkout";
import { PRODUCTS } from "@/lib/payments/catalog";

/** Boost from the profile dashboard. The full store lives at /upgrade. */
export function BoostPay({ live }: { live?: boolean }) {
  return (
    <div className="rounded-3xl border border-line p-5">
      <p className="font-display text-2xl">{PRODUCTS.boost_1.title}</p>
      <p className="mt-2 text-sm text-muted">{PRODUCTS.boost_1.line}</p>
      {live ? <p className="mt-2 text-xs text-gold">You’re Boosted right now</p> : null}
      <Checkout sku="boost_1" variant="gold" />
      <Link href="/upgrade" className="mt-3 block text-xs text-muted">
        Gold, Platinum and bundles →
      </Link>
    </div>
  );
}
