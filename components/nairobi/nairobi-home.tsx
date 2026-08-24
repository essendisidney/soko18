"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { BROWSE_CATEGORIES } from "@/lib/browse/categories";
import { searchNairobi } from "@/lib/browse/feed";
import { NAIROBI_AREAS, NAIROBI_FILTERS, NAIROBI_NOW } from "@/lib/data/nairobi";
import { nairobiProfiles } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import {
  activeNow,
  filterNairobi,
  nairobiNow,
  type NairobiFilter,
  type NairobiNowId,
} from "@/lib/nairobi/live";
import { ProfileCard } from "@/components/soko/profile-card";
import { Chip } from "@/components/soko/chip";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

export function NairobiHome({
  showChrome = true,
  nearArea = "kilimani",
}: {
  showChrome?: boolean;
  nearArea?: string;
}) {
  const [q, setQ] = useState("");
  const [facet, setFacet] = useState<NairobiFilter>("trending");
  const [now, setNow] = useState<NairobiNowId>("trending");
  const live = activeNow();
  const featured = searchNairobi("").filter((p) => p.featured);
  const grid = q ? searchNairobi(q) : filterNairobi(facet, nearArea);

  return (
    <div className="pb-6">
      {showChrome ? (
        <div className="flex items-center justify-between">
          <Wordmark size="sm" />
          <div className="flex rounded-full border border-line p-1 text-[12px]">
            <Link href="/discover" className="rounded-full px-3 py-1 text-muted">
              Discover
            </Link>
            <span className="rounded-full bg-cream px-3 py-1 text-bg">Browse</span>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-[13px] tracking-[0.22em] text-gold uppercase">Nairobi</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Local discovery</h1>
      <p className="mt-2 text-sm text-muted">
        {nairobiProfiles().filter(hasApprovedCover).length} live · {live.city} active now
      </p>

      <section className="glass mt-6 rounded-3xl p-4">
        <p className="text-[11px] tracking-[0.16em] text-gold uppercase">Active now</p>
        <p className="mt-2 font-display text-2xl">{live.city} in Nairobi</p>
        <p className="mt-1 text-xs text-muted">Area-level only. Never a precise location.</p>
        <ul className="mt-4 space-y-1.5 text-sm">
          {live.areas.map((area) => (
            <li key={area.slug} className="flex justify-between">
              <Link href={`/nairobi/${area.slug}`}>{area.name}</Link>
              <span className="text-muted">{area.count} active</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {NAIROBI_FILTERS.map((f) => (
          <Chip key={f.id} selected={facet === f.id} onClick={() => setFacet(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <label className="glass mt-4 flex items-center gap-3 rounded-full px-4 py-3">
        <Search className="size-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Nairobi"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <Link href="/discover" className="mt-5 block">
        <Button className="w-full" variant="gold">
          Discover
        </Button>
      </Link>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {grid.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} compact href={`/profile/${profile.slug}`} />
        ))}
        {grid.length === 0 ? (
          <p className="col-span-2 text-sm text-muted">
            {q ? "No one in Nairobi matches that." : "No live profiles in this view yet."}
          </p>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="text-sm text-muted">Categories</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {BROWSE_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="rounded-full border border-line px-3 py-1.5 text-sm"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm text-muted">Featured</h2>
          <p className="mt-1 text-xs text-muted">Paid placement. Not organic Nairobi Now.</p>
          <div className="mt-4 flex gap-3 overflow-x-auto">
            {featured.map((profile) => (
              <div key={profile.id} className="w-36 shrink-0">
                <ProfileCard profile={profile} compact href={`/profile/${profile.slug}`} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm text-muted">Popular areas</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {NAIROBI_AREAS.map((area) => (
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

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">Nairobi Now</h2>
        <p className="mt-1 text-xs text-muted">From real activity. Paid placement is labeled separately.</p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {NAIROBI_NOW.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNow(item.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm",
                now === item.id ? "bg-cream text-bg" : "border border-line text-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto">
          {nairobiNow(now).slice(0, 8).map((profile) => (
            <div key={profile.id} className="w-36 shrink-0">
              <ProfileCard profile={profile} compact href={`/profile/${profile.slug}`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
