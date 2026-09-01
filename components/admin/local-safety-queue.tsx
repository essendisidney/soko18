"use client";

import { useEffect, useState } from "react";
import { staffQueue, type ReportFlag } from "@/lib/reports/tally";
import { readReportFlags } from "@/lib/reports/local";
import { nairobiProfiles } from "@/lib/data/seed";

export function LocalSafetyQueue() {
  const [flags, setFlags] = useState<ReportFlag[]>([]);

  useEffect(() => {
    setFlags(readReportFlags());
  }, []);

  const queue = staffQueue(flags);
  if (queue.length === 0) {
    return <p className="mt-8 text-sm text-muted">No three-report cases on this device. Empty stays empty.</p>;
  }

  return (
    <ul className="mt-8 max-w-2xl space-y-2">
      {queue.map((row) => {
        const profile = nairobiProfiles().find((item) => item.id === row.profileId);
        return (
          <li key={row.profileId} className="rounded-2xl border border-line px-4 py-3 text-sm">
            <p>{profile?.name ?? row.profileId}</p>
            <p className="mt-1 text-xs text-gold">
              {row.count} reports · staff review. Hidden from Discover.
            </p>
          </li>
        );
      })}
    </ul>
  );
}
