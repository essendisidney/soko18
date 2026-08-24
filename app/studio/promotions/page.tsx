import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";
import { AllPromotions } from "@/components/studio/promotion-pay";
import { getStudioOverview } from "@/lib/studio/overview";

export const dynamic = "force-dynamic";

export default async function StudioPromotionsPage() {
  const result = await getStudioOverview();

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-6 pb-16">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Studio</p>
      <Wordmark className="mt-2" size="sm" />
      <h1 className="mt-8 font-display text-3xl tracking-tight">Promotions</h1>
      <p className="mt-2 text-sm text-muted">Boost, Spotlight, and Featured are paid. Nairobi Now is not for sale.</p>

      <div className="mt-8">
        <AllPromotions live={result.ok ? result.data.promotions.live : undefined} />
      </div>

      <Link href="/studio" className="mt-10 inline-block">
        <Button variant="ghost" size="sm">
          Back to studio
        </Button>
      </Link>
    </main>
  );
}
