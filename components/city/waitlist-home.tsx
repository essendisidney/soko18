"use client";

import Link from "next/link";
import { RememberArea } from "@/components/nairobi/remember-area";
import { WaitlistButton, WaitlistDiscover } from "@/components/nairobi/waitlist-button";
import { PlaceShare } from "@/components/nairobi/place-share";
import { AreaChips, CitySearch, KenyaChips } from "@/components/city/city-door";
import { cityPlaceLine } from "@/lib/nairobi/live";

export function WaitlistHome({
  name,
  slug,
  areas = [],
  areaBase,
}: {
  name: string;
  slug: string;
  areas?: readonly { slug: string; name: string }[];
  areaBase?: string;
}) {
  const base = areaBase ?? `/${slug}`;

  return (
    <div>
      <RememberArea citySlug={slug} />
      <p className="text-[13px] tracking-[0.22em] text-gold uppercase">{name}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Local discovery</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Men around you in {name}. Area-level only. Never a precise location.
      </p>
      <p className="mt-1 text-sm text-muted">{cityPlaceLine(slug)}</p>

      {areas.length > 0 ? (
        <section className="glass mt-6 rounded-3xl p-4">
          <p className="text-[11px] tracking-[0.16em] text-gold uppercase">Active now</p>
          <p className="mt-2 font-display text-2xl">{name}</p>
          <p className="mt-1 text-xs text-muted">Area-level only. Never a precise location.</p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {areas.map((area) => (
              <li key={area.slug}>
                <Link href={`${base}/${area.slug}`}>{area.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <CitySearch citySlug={slug} cityName={name} />

      <WaitlistDiscover slug={slug} />
      <WaitlistButton slug={slug} />

      <AreaChips citySlug={slug} areas={areas} />
      <KenyaChips except={slug} />

      <PlaceShare shareName={name} path={base} shareLabel={`Share ${name}`} />
    </div>
  );
}
