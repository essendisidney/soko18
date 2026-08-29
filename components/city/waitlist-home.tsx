import Link from "next/link";
import { WaitlistButton } from "@/components/nairobi/waitlist-button";
import { Button } from "@/components/soko/button";

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
      <p className="text-[13px] tracking-[0.22em] text-gold uppercase">{name}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Coming after Nairobi.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        SOKO18 launches city by city. We will not dilute Nairobi to look national.
      </p>
      <p className="mt-2 text-xs text-muted">Area-level only. Never a precise location.</p>
      <WaitlistButton slug={slug} />
      <Link href="/discover" className="mt-4 block">
        <Button variant="ghost" className="w-full">
          Discover Nairobi
        </Button>
      </Link>
      {areas.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm text-muted">Popular areas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {areas.map((area) => (
              <Link
                key={area.slug}
                href={`${base}/${area.slug}`}
                className="rounded-full border border-line px-3 py-1.5 text-sm"
              >
                {area.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
