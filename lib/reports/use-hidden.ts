"use client";

import { useSyncExternalStore } from "react";
import { hiddenFromPublicIds, reportedIdsForViewer, type ReportFlag } from "@/lib/reports/tally";
import { reportFlagsSnapshot, subscribeReportFlags } from "@/lib/reports/local";

function parse(raw: string | null): ReportFlag[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ReportFlag[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useHiddenByReports(reporterId = "local") {
  const flags = parse(useSyncExternalStore(subscribeReportFlags, reportFlagsSnapshot, () => null));
  return [...new Set([...reportedIdsForViewer(flags, reporterId), ...hiddenFromPublicIds(flags)])];
}
