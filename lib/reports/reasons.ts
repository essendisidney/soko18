export const REPORT_REASONS = ["spam", "harassment", "fake", "underage", "unsafe", "other"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
