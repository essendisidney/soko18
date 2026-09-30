"use client";

import { useEffect } from "react";
import { writeCity, writeNearArea } from "@/lib/nairobi/near";

export function RememberArea({ slug, citySlug }: { slug?: string; citySlug?: string }) {
  useEffect(() => {
    if (citySlug) writeCity(citySlug);
    if (slug) writeNearArea(slug);
  }, [slug, citySlug]);
  return null;
}
