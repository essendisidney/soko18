"use client";

import { useEffect, useState } from "react";
import { cityNameBySlug } from "@/lib/geo/kenya";
import { nearAreaName } from "@/lib/nairobi/near";

/** "23 people active in Kilimani now": real, last 15 minutes, never shown below 10. */
export function ActiveNow({ city, area }: { city: string; area: string | null }) {
  const [result, setResult] = useState<{ key: string; count: number | null } | null>(null);
  const key = `${city}|${area ?? ""}`;

  useEffect(() => {
    const params = new URLSearchParams({ city });
    if (area) params.set("area", area);
    let cancelled = false;
    void fetch(`/api/active-now?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { count: number | null } } | null) => {
        if (!cancelled) setResult({ key, count: json?.data?.count ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [city, area, key]);

  const count = result?.key === key ? result.count : null;
  if (!count) return null;
  return (
    <p className="mx-1 mt-2 flex items-center gap-2 px-2 text-[12px] text-cream/80">
      <span className="size-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
      {count} people active in {area ? nearAreaName(area) : cityNameBySlug(city)} now
    </p>
  );
}
