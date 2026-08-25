import Link from "next/link";
import { Button } from "@/components/soko/button";
import { AllPromotions } from "@/components/studio/promotion-pay";
import { getStudioOverview } from "@/lib/studio/overview";

export const dynamic = "force-dynamic";

export default async function StudioPromotionsPage() {
  const result = await getStudioOverview();

  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Studio</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Promotions</h1>
      <p className="mt-2 text-sm text-muted">Boost, Spotlight, and Featured are paid. Nairobi Now is not for sale.</p>

      <div className="mt-8">
        <AllPromotions live={result.ok ? result.data.promotions.live : undefined} />
      </div>

      <Link href="/studio" className="mt-10 inline-block">
        <Button variant="ghost" size="sm">
          Back to studio
        </Button>
      </Link>
    </div>
  );
}
