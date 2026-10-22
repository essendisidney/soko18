"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";
import { useAuth } from "@/lib/auth/use-auth";
import { formatKes } from "@/lib/payments/ledger";
import { PRODUCTS } from "@/lib/payments/catalog";

/**
 * Privacy that the server actually enforces: Incognito (a paid plan, checked in the database)
 * and blocking (both people disappear for each other). Nothing here is device-only.
 */
export function DiscretionTools() {
  const { user } = useAuth();
  const [incognito, setIncognito] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/me/entitlements")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { incognito?: boolean } } | null) => setIncognito(Boolean(json?.data?.incognito)))
      .catch(() => {});
  }, [user]);

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="text-sm text-muted">Incognito</h2>
        <p className="mt-2 text-sm text-muted">
          Only people you like can see you. {formatKes(PRODUCTS.incognito_month.amountKes)} for 30 days, or included with Platinum.
        </p>
        {incognito ? (
          <p className="mt-3 text-sm text-gold">You’re incognito.</p>
        ) : (
          <Link href="/upgrade#incognito" className="mt-4 block">
            <Button className="w-full" variant="ghost">
              Go incognito
            </Button>
          </Link>
        )}
      </div>

      <div>
        <h2 className="text-sm text-muted">Blocking</h2>
        <p className="mt-2 text-sm text-muted">
          Open someone’s profile or chat and tap ⋯ → Block. You disappear for each other: they can’t see you, like you or
          message you, and you won’t see them. Manage blocks in{" "}
          <Link href="/blocked" className="text-cream/80 underline-offset-4 hover:underline">
            Blocked
          </Link>
          .
        </p>
      </div>

      <div>
        <h2 className="text-sm text-muted">Dating safely</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>A first name or nickname is enough.</li>
          <li>Keep your workplace and surname off your profile until you trust someone.</li>
          <li>Meet somewhere public the first time, and tell a friend where you’ll be.</li>
          <li>Never send money to someone you met here.</li>
        </ul>
      </div>
    </section>
  );
}
