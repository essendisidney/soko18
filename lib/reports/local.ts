import { addReportFlag, type ReportFlag } from "@/lib/reports/tally";

export const REPORT_FLAGS_KEY = "soko18_report_flags";
export const REPORT_FLAGS_EVENT = "soko18-report-flags";

export function readReportFlags(): ReportFlag[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(REPORT_FLAGS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is ReportFlag =>
        Boolean(row) &&
        typeof row === "object" &&
        typeof (row as ReportFlag).profileId === "string" &&
        typeof (row as ReportFlag).reporterId === "string",
    );
  } catch {
    return [];
  }
}

export function writeReportFlags(flags: ReportFlag[]) {
  localStorage.setItem(REPORT_FLAGS_KEY, JSON.stringify(flags.slice(-400)));
  window.dispatchEvent(new Event(REPORT_FLAGS_EVENT));
}

export function writeReportFlag(profileId: string, reporterId: string, reason: string) {
  const next = addReportFlag(readReportFlags(), {
    profileId,
    reporterId,
    reason,
    at: Date.now(),
  });
  writeReportFlags(next.flags);
  return next;
}

export function subscribeReportFlags(onChange: () => void) {
  window.addEventListener(REPORT_FLAGS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(REPORT_FLAGS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function reportFlagsSnapshot() {
  return localStorage.getItem(REPORT_FLAGS_KEY);
}
