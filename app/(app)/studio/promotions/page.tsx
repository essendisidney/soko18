import Link from "next/link";
import { Button } from "@/components/soko/button";
import { AllPromotions } from "@/components/studio/promotion-pay";
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
          ? "Boost, Spotlight, and Featured are paid. Nairobi Now is not for sale."
          : "Boost after you’re live in Nairobi. Nairobi Now is not for sale."}
      </p>

      <div className="mt-8">
        {live ? (
          <AllPromotions live={result.ok ? result.data.promotions.live : undefined} />
        ) : (
          <Link href="/discover" className="block">
            <Button variant="gold" className="w-full">
              Discover
            </Button>
          </Link>
        )}
      </div>

      <Link href="/studio" className="mt-10 inline-block">
        <Button variant="ghost" size="sm">
          Back to studio
        </Button>
      </Link>
    </div>
  );
}
