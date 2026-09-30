"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { SearchNotifyButton } from "@/components/nairobi/search-notify";
import { emptySearchLine, searchCity } from "@/lib/browse/feed";
import { useBrowse } from "@/lib/browse/use-browse";
import { ProfileCard } from "@/components/soko/profile-card";
import { areaBrowseHref, areasForCity, cityHomeHref, cityNameBySlug, kenyaDoorCities } from "@/lib/geo/kenya";
import { cityPlaceLine } from "@/lib/nairobi/live";
import { nearAreaSnapshot, subscribeNearArea } from "@/lib/nairobi/near";
import { useSnappedCity } from "@/lib/nairobi/use-near-area";

export function CitySearch({
  citySlug,
  cityName,
}: {
  citySlug: string;
  cityName: string;
}) {
  const [q, setQ] = useState("");
  const searching = Boolean(q.trim());
  const live = useBrowse(citySlug, q, "trending");
  const matches = searching ? (live ?? searchCity(citySlug, q)) : [];

  return (
    <>
      <label className="glass mt-4 flex items-center gap-3 rounded-full px-4 py-3">
        <Search className="size-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${cityName}`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>
      {searching && matches.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {matches.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} compact href={`/profile/${profile.slug}`} />
          ))}
        </div>
      ) : null}
      {searching && matches.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-muted">{emptySearchLine(cityName)}</p>
          <SearchNotifyButton query={q} />
        </div>
      ) : null}
    </>
  );
}

export function AreaChips({
  citySlug,
  areas,
  except,
  title = "Popular areas",
  compact = false,
}: {
  citySlug: string;
  areas: readonly { slug: string; name: string }[];
  except?: string;
  title?: string | null;
  compact?: boolean;
}) {
  const list = except ? areas.filter((area) => area.slug !== except) : areas;
  if (list.length === 0) return null;

  return (
    <section className={compact ? "mt-6 w-full" : "mt-10"}>
      {title ? <h2 className={`text-sm text-muted ${compact ? "text-center" : ""}`}>{title}</h2> : null}
      <div className={`flex flex-wrap gap-2 ${compact || !title ? "justify-center" : ""} ${title ? "mt-3" : ""}`}>
        {list.map((area) => (
          <Link
            key={area.slug}
            href={areaBrowseHref(citySlug, area.slug)}
            className="rounded-full border border-line px-3 py-1.5 text-sm"
          >
            {area.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function KenyaChips({
  except,
  liveOnly = false,
  compact = false,
}: {
  except?: string;
  liveOnly?: boolean;
  compact?: boolean;
}) {
  const kenya = kenyaDoorCities(except).filter((city) => (liveOnly ? city.slug === "nairobi" : true));
  if (kenya.length === 0) return null;

  return (
    <section className={compact ? "mt-4 w-full" : "mt-10"}>
      <h2 className={`text-sm text-muted ${compact ? "text-center" : ""}`}>Kenya</h2>
      <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "justify-center" : ""}`}>
        {kenya.map((city) => (
          <Link
            key={city.slug}
            href={cityHomeHref(city.slug)}
            className="rounded-full border border-line px-3 py-1.5 text-sm"
          >
            {city.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Empty rooms stay in the snapped city. Nairobi is the live Kenya door. */
export function SnappedCityKicker({
  className = "text-[11px] tracking-[0.22em] text-gold uppercase",
}: {
  className?: string;
}) {
  const citySlug = useSnappedCity();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <p className={className}>{mounted ? cityNameBySlug(citySlug) : "Kenya"}</p>;
}

export function SnappedPlaceNote() {
  const citySlug = useSnappedCity();
  const near = useSyncExternalStore(subscribeNearArea, nearAreaSnapshot, () => null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <p className="mt-1 text-sm text-muted">
      {mounted ? cityPlaceLine(citySlug, near) : "Kenya. Area-level only."}
    </p>
  );
}

export function EmptyCityLoop({
  citySlug,
  compact = false,
}: {
  citySlug: string;
  compact?: boolean;
}) {
  return (
    <>
      <AreaChips citySlug={citySlug} areas={areasForCity(citySlug)} title="Areas" compact={compact} />
      <KenyaChips except={citySlug} liveOnly compact={compact} />
    </>
  );
}
