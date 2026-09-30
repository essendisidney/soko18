"use client";

import { useEffect, useState } from "react";
import { readShowMe } from "@/lib/onboarding";
import type { SeedProfile } from "@/lib/types";

/**
 * Server-backed browse results (real members + demo when allowed).
 * Returns null until the first response, so callers can fall back to local demo data.
 */
export function useBrowse(city: string, q: string, facet: string) {
  const [items, setItems] = useState<SeedProfile[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ city, facet, gender: readShowMe() });
    if (q.trim()) params.set("q", q.trim());
    const id = window.setTimeout(() => {
      void fetch(`/api/browse?${params.toString()}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((json: { data?: { items?: SeedProfile[] } } | null) => {
          if (json?.data?.items) setItems(json.data.items);
        })
        .catch(() => {});
    }, q ? 250 : 0);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [city, q, facet]);

  return items;
}
