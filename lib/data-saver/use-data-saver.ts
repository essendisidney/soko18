"use client";

import { useSyncExternalStore } from "react";
import { readSaverChoice, saverOn } from "@/lib/data-saver/settings";

function subscribe(listener: () => void) {
  window.addEventListener("kutana-data-saver", listener);
  const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
  connection?.addEventListener?.("change", listener);
  return () => {
    window.removeEventListener("kutana-data-saver", listener);
    connection?.removeEventListener?.("change", listener);
  };
}

function snapshot() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return saverOn(readSaverChoice(), connection);
}

/** True when photos in grids should wait for a tap. Always false during server render. */
export function useDataSaver() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
