/**
 * Campus launch night: a campus opens the moment enough students verify, and its launch party
 * is the first Sunday live night after that. Worked out from real dates, nothing to schedule.
 */
import { liveNight } from "@/lib/live-night";
import type { RaceRow } from "@/lib/campus/race";

export type LaunchNight =
  | { kind: "upcoming"; start: Date; end: Date; live: boolean }
  | { kind: "promise" }
  | null;

export function launchNight(row: Pick<RaceRow, "status" | "openedAt">, now = new Date()): LaunchNight {
  if (row.status !== "live") return { kind: "promise" };
  if (!row.openedAt) return null;
  const night = liveNight(new Date(row.openedAt));
  // Only worth showing until that night is over.
  if (now >= night.end) return null;
  return { kind: "upcoming", start: night.start, end: night.end, live: now >= night.start };
}

export function launchDay(start: Date) {
  return start.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
}
