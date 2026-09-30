"use client";

import { useSyncExternalStore } from "react";
import { citySnapshot, DEFAULT_NEAR_AREA, nearAreaSnapshot, subscribeNearArea } from "@/lib/nairobi/near";

export function useNearArea(fallback = DEFAULT_NEAR_AREA) {
  const stored = useSyncExternalStore(subscribeNearArea, nearAreaSnapshot, () => null);
  return stored || fallback;
}

export function useSnappedCity() {
  return useSyncExternalStore(subscribeNearArea, citySnapshot, () => "nairobi");
}
