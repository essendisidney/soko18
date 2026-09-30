"use client";

import { REPORT_REASON_LABELS, REPORT_REASONS } from "@/lib/reports/reasons";

export function ReportReasons({
  onPick,
  onCancel,
}: {
  onPick: (reason: (typeof REPORT_REASONS)[number]) => void;
  onCancel: () => void;
}) {
  return (
    <div className="glass mt-3 rounded-2xl p-3 text-sm">
      <p className="px-2 py-1 text-xs text-muted">Why are you reporting?</p>
      <div className="mt-1 flex flex-wrap gap-2 px-2">
        {REPORT_REASONS.map((reason) => (
          <button
            key={reason}
            type="button"
            className="rounded-full border border-line px-3 py-1.5"
            onClick={() => onPick(reason)}
          >
            {REPORT_REASON_LABELS[reason]}
          </button>
        ))}
      </div>
      <button type="button" className="mt-2 px-2 py-1 text-xs text-muted" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
