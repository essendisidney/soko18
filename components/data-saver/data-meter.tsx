"use client";

import { useEffect } from "react";
import { addUsage, localDay, USAGE_KEY } from "@/lib/data-saver/settings";

/**
 * Counts what this app downloads today, on this device only. Uses the browser's own transfer
 * sizes; photos from storage count only when the server allows it, so the total is a floor.
 */
export function DataMeter() {
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;
    let pending = 0;
    const flush = () => {
      if (!pending) return;
      try {
        localStorage.setItem(USAGE_KEY, JSON.stringify(addUsage(localStorage.getItem(USAGE_KEY), pending, localDay())));
      } catch {}
      pending = 0;
    };
    const count = (entries: PerformanceEntryList) => {
      for (const entry of entries) pending += (entry as PerformanceResourceTiming).transferSize || 0;
    };
    count(performance.getEntriesByType("navigation"));
    count(performance.getEntriesByType("resource"));
    const observer = new PerformanceObserver((list) => count(list.getEntries()));
    try {
      observer.observe({ type: "resource", buffered: false });
    } catch {}
    const timer = window.setInterval(flush, 10_000);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, []);
  return null;
}
