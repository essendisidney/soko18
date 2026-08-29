"use client";

import { useState } from "react";
import Link from "next/link";
import { NAIROBI_AREAS } from "@/lib/data/nairobi";
import { nairobiInventoryLine } from "@/lib/nairobi/live";
import { areaUrl, shareProfile } from "@/lib/profile/share";
import { RememberArea } from "@/components/nairobi/remember-area";
import { ProfileGrid } from "@/components/profile/profile-grid";
import { Button } from "@/components/soko/button";
import type { SeedProfile } from "@/lib/types";

export function AreaHome({
  name,
  slug,
  people,
}: {
  name: string;
  slug: string;
  people: SeedProfile[];
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const inventory = nairobiInventoryLine();
  const nearby = NAIROBI_AREAS.filter((area) => area.slug !== slug);

  return (
    <div>
      <RememberArea slug={slug} />
      <p className="text-[13px] tracking-[0.22em] text-gold uppercase">Nairobi</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{name}</h1>
      <p className="mt-2 text-sm text-muted">{inventory ?? "Area-level only. Never a precise location."}</p>
      <Link href="/discover" className="mt-6 block">
        <Button variant="gold" className="w-full">
          Discover
        </Button>
      </Link>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <ProfileGrid profiles={people} emptyText={`No one in ${name} yet.`} />
      </div>
      <section className="mt-10">
        <h2 className="text-sm text-muted">Other areas</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {nearby.map((area) => (
            <Link
              key={area.slug}
              href={`/nairobi/${area.slug}`}
              className="rounded-full border border-line px-3 py-1.5 text-sm"
            >
              {area.name}
            </Link>
          ))}
        </div>
      </section>
      <div className="mt-8 flex items-center justify-between">
        <Link href="/nairobi" className="text-sm text-muted">
          All of Nairobi
        </Link>
        <button
          type="button"
          className="text-sm text-cream/80"
          onClick={() => {
            void shareProfile(`${name}, Nairobi`, areaUrl(slug)).then((result) => {
              setNotice(result === "copied" ? "Link copied." : result === "failed" ? "Couldn’t share." : null);
            });
          }}
        >
          Share
        </button>
      </div>
      {notice ? <p className="mt-3 text-xs text-muted">{notice}</p> : null}
    </div>
  );
}
