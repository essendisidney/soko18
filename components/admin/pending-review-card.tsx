"use client";

import { StatCard } from "@/components/soko/stat-card";
import { usePendingQueue } from "@/lib/media/use-queue";

export function PendingReviewCard() {
  const pending = usePendingQueue().length;
  return <StatCard label="Pending review" value={String(pending)} />;
}

export function PendingCount() {
  return <>{usePendingQueue().length}</>;
}
