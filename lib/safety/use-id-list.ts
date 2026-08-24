"use client";

import { useSyncExternalStore } from "react";
import { parseIdList } from "@/lib/safety/local-ids";

export function useLocalIds(
  subscribe: (onChange: () => void) => () => void,
  snapshot: () => string | null,
) {
  return parseIdList(useSyncExternalStore(subscribe, snapshot, () => null));
}
