export const REPORT_REASONS = [
  "paid_services",
  "spam",
  "harassment",
  "fake",
  "underage",
  "unsafe",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  paid_services: "Selling or asking for money",
  spam: "Spam",
  harassment: "Harassment",
  fake: "Fake profile",
  underage: "Under 18",
  unsafe: "Unsafe",
  other: "Other",
};
