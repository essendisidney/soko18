import { RememberArea } from "@/components/nairobi/remember-area";
import { WaitlistButton, WaitlistDiscover } from "@/components/nairobi/waitlist-button";
import { PlaceShare } from "@/components/nairobi/place-share";
import { HereNowButton } from "@/components/presence/here-now";

export function WaitlistArea({
  cityName,
  citySlug,
  areaName,
  areaSlug,
}: {
  cityName: string;
  citySlug: string;
  areaName: string;
  areaSlug: string;
}) {
  return (
    <div>
      <RememberArea slug={areaSlug} />
      <p className="text-[13px] tracking-[0.22em] text-gold uppercase">{cityName}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{areaName}</h1>
      <p className="mt-2 text-sm text-muted">Men around you. Area-level only.</p>
      <HereNowButton areaSlug={areaSlug} citySlug={citySlug} />
      <WaitlistDiscover slug={citySlug} />
      <WaitlistButton slug={citySlug} />
      <PlaceShare
        backHref={`/${citySlug}`}
        backLabel={`All of ${cityName}`}
        shareName={`${areaName}, ${cityName}`}
        path={`/${citySlug}/${areaSlug}`}
        shareLabel={`Share ${areaName}`}
      />
    </div>
  );
}
