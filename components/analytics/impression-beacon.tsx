"use client";

import { useEffect } from "react";
import type { AnalyticsSurface } from "@/lib/analytics/engine";

export function ImpressionBeacon({
  profileId,
  surface,
}: {
  profileId: string;
  surface: AnalyticsSurface;
}) {
  useEffect(() => {
    void fetch("/api/discover/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, surface }),
    });
  }, [profileId, surface]);
  return null;
}
