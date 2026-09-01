import Link from "next/link";
import { Button } from "@/components/soko/button";
import { AllPromotions } from "@/components/studio/promotion-pay";
import { LocalPayButton } from "@/components/payments/local-pay-button";
import { formatKes } from "@/lib/payments/ledger";
import { ACCESS_CATALOG, BUNDLE_CATALOG, PRIVACY_CATALOG, SUBSCRIPTION_CATALOG } from "@/lib/payments/catalog";
import { getStudioOverview } from "@/lib/studio/overview";
import { profileCanPromote } from "@/lib/studio/promote";

export const dynamic = "force-dynamic";

export default async function StudioPromotionsPage() {
  const result = await getStudioOverview();
  const live = result.ok && profileCanPromote(result.data.profile?.status);

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Studio</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Promotions</h1>
      <p className="mt-2 text-sm text-muted">
        {live
          ? "Subscriptions are the foundation. Boosts are impulse. Pay on M-Pesa. Nairobi Now is not for sale."
          : "Membership prices are live. Boost after you’re live. Nairobi Now is not for sale."}
      </p>

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Membership</p>
        {Object.entries(SUBSCRIPTION_CATALOG).map(([id, item]) => (
          <div key={id} className="rounded-3xl border border-line p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="mt-2 text-sm text-muted">
              {item.line} {formatKes(item.amountKes)} / month.
            </p>
            <LocalPayButton
              kind={id as "basic" | "premium"}
              idleLabel={`Sandbox · ${formatKes(item.amountKes)}`}
              settledLabel="Sandbox membership. Review still decides live."
            />
          </div>
        ))}
        <div className="rounded-3xl border border-line p-5">
          <p className="font-display text-2xl">{BUNDLE_CATALOG["spotlight-boost"].title}</p>
          <p className="mt-2 text-sm text-muted">
            {BUNDLE_CATALOG["spotlight-boost"].line} {formatKes(BUNDLE_CATALOG["spotlight-boost"].amountKes)}.
          </p>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Discretion</p>
        {Object.entries(PRIVACY_CATALOG).map(([id, item]) => (
          <div key={id} className="rounded-3xl border border-line p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="mt-2 text-sm text-muted">
              {item.line} {formatKes(item.amountKes)} / month.
            </p>
          </div>
        ))}
        {Object.entries(ACCESS_CATALOG).map(([id, item]) => (
          <div key={id} className="rounded-3xl border border-line p-5">
            <p className="font-display text-2xl">{item.title}</p>
            <p className="mt-2 text-sm text-muted">
              {item.line} {formatKes(item.amountKes)}.
            </p>
          </div>
        ))}
      </section>

      <div className="mt-8">
        {live ? <AllPromotions live={result.ok ? result.data.promotions.live : undefined} /> : null}
        <Link href="/discover" className={live ? "mt-8 block" : "block"}>
          <Button variant={live ? "ghost" : "gold"} className="w-full">
            Discover
          </Button>
        </Link>
      </div>

      <Link href="/studio" className="mt-10 inline-block">
        <Button variant="ghost" size="sm">
          Back to studio
        </Button>
      </Link>
    </div>
  );
}
