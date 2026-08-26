"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_NEAR_AREA, nearAreaSnapshot, subscribeNearArea } from "@/lib/nairobi/near";

export function useNearArea(fallback = DEFAULT_NEAR_AREA) {
  const stored = useSyncExternalStore(subscribeNearArea, nearAreaSnapshot, () => null);
  return stored || fallback;
}
