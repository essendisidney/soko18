export const REPORT_REVIEW_THRESHOLD = 3;

export type ReportFlag = {
  profileId: string;
  reporterId: string;
  reason: string;
  at: number;
};

export function uniqueReporterCount(flags: ReportFlag[], profileId: string) {
  return new Set(flags.filter((row) => row.profileId === profileId).map((row) => row.reporterId)).size;
}

export function needsStaffReview(count: number) {
  return count >= REPORT_REVIEW_THRESHOLD;
}

export function hideFromPublic(count: number) {
  return needsStaffReview(count);
}

export function safetyPenalty(count: number) {
  if (count <= 0) return 0;
  return Math.min(1, count / REPORT_REVIEW_THRESHOLD);
}

export function ratingFit(average: number | null) {
  if (average == null) return 0.5;
  return Math.max(0, Math.min(1, average / 5));
}

export function reportedIdsForViewer(flags: ReportFlag[], reporterId: string) {
  return [...new Set(flags.filter((row) => row.reporterId === reporterId).map((row) => row.profileId))];
}

export function hiddenFromPublicIds(flags: ReportFlag[]) {
  const ids = new Set(flags.map((row) => row.profileId));
  return [...ids].filter((id) => hideFromPublic(uniqueReporterCount(flags, id)));
}

export function staffQueue(flags: ReportFlag[]) {
  const ids = [...new Set(flags.map((row) => row.profileId))];
  return ids
    .map((profileId) => ({
      profileId,
      count: uniqueReporterCount(flags, profileId),
    }))
    .filter((row) => needsStaffReview(row.count))
    .sort((a, b) => b.count - a.count || a.profileId.localeCompare(b.profileId));
}

export function addReportFlag(
  flags: ReportFlag[],
  next: ReportFlag,
): { flags: ReportFlag[]; count: number; staff: boolean } {
  const already = flags.some((row) => row.profileId === next.profileId && row.reporterId === next.reporterId);
  const list = already ? flags : [...flags, next];
  const count = uniqueReporterCount(list, next.profileId);
  return { flags: list.slice(-400), count, staff: needsStaffReview(count) };
}
