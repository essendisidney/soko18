import Link from "next/link";
import { WaitlistButton } from "@/components/nairobi/waitlist-button";
import { PlaceShare } from "@/components/nairobi/place-share";
import { Button } from "@/components/soko/button";

export function WaitlistArea({
  cityName,
  citySlug,
  areaName,
}: {
  cityName: string;
  citySlug: string;
  areaName: string;
}) {
  return (
    <div>
      <p className="text-[13px] tracking-[0.22em] text-gold uppercase">{cityName}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{areaName}</h1>
      <p className="mt-2 text-sm text-muted">Coming after Nairobi. Area-level only.</p>
      <WaitlistButton slug={citySlug} />
      <Link href="/discover" className="mt-4 block">
        <Button variant="ghost" className="w-full">
          Discover Nairobi
        </Button>
      </Link>
      <PlaceShare
        backHref={`/${citySlug}`}
        backLabel={`All of ${cityName}`}
        shareName="Nairobi"
        path="/nairobi"
        shareLabel="Share Nairobi"
      />
    </div>
  );
}
