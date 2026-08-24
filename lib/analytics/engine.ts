import { shiftDay } from "@/lib/analytics/day";

export type DailyStat = {
  day: string;
  views: number;
  likes: number;
  matches: number;
};

export type LedgerRevenueRow = {
  type: string;
  direction: "debit" | "credit";
  amountKes: number;
  createdAt: string;
};

export const ANALYTICS_SURFACES = ["discover", "browse", "profile"] as const;
export type AnalyticsSurface = (typeof ANALYTICS_SURFACES)[number];

export function isAnalyticsSurface(value: unknown): value is AnalyticsSurface {
  return ANALYTICS_SURFACES.includes(value as AnalyticsSurface);
}

export function applyImpression(stats: DailyStat[], day: string) {
  const index = stats.findIndex((row) => row.day === day);
  if (index === -1) {
    return [...stats, { day, views: 1, likes: 0, matches: 0 }];
  }
  return stats.map((row, i) => (i === index ? { ...row, views: row.views + 1 } : row));
}

export function applyLikeStat(stats: DailyStat[], day: string, kind: "pass" | "like" | "spotlight") {
  if (kind === "pass") return stats;
  const index = stats.findIndex((row) => row.day === day);
  if (index === -1) {
    return [...stats, { day, views: 0, likes: 1, matches: 0 }];
  }
  return stats.map((row, i) => (i === index ? { ...row, likes: row.likes + 1 } : row));
}

function sumRange(rows: DailyStat[], start: string, end: string, key: keyof Omit<DailyStat, "day">) {
  return rows
    .filter((row) => row.day >= start && row.day <= end)
    .reduce((total, row) => total + row[key], 0);
}

export function studioWindows(rows: DailyStat[], today: string) {
  const recentStart = shiftDay(today, -6);
  const previousStart = shiftDay(today, -13);
  const previousEnd = shiftDay(today, -7);
  const series: DailyStat[] = [];
  for (let day = recentStart; day <= today; day = shiftDay(day, 1)) {
    const found = rows.find((row) => row.day === day);
    series.push(found ?? { day, views: 0, likes: 0, matches: 0 });
  }
  return {
    recent: {
      views: sumRange(rows, recentStart, today, "views"),
      likes: sumRange(rows, recentStart, today, "likes"),
      matches: sumRange(rows, recentStart, today, "matches"),
    },
    previous: {
      views: sumRange(rows, previousStart, previousEnd, "views"),
      likes: sumRange(rows, previousStart, previousEnd, "likes"),
      matches: sumRange(rows, previousStart, previousEnd, "matches"),
    },
    series,
  };
}

export function revenueKes(entries: LedgerRevenueRow[], fromIso: string, toIso: string) {
  return entries
    .filter(
      (row) =>
        row.type === "payment" &&
        row.direction === "debit" &&
        row.createdAt >= fromIso &&
        row.createdAt < toIso &&
        row.amountKes > 0,
    )
    .reduce((total, row) => total + row.amountKes, 0);
}

const STRIP = new Set(["body", "media_path", "mediaPath", "url", "mediaUrl"]);

export function sanitizeAnalyticsEvent(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (STRIP.has(key)) continue;
    out[key] = value;
  }
  return out;
}
