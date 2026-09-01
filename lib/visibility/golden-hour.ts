import { nairobiHour } from "@/lib/nairobi/live";

export const GOLDEN_START_HOUR = 20;
export const GOLDEN_END_HOUR = 21;

export function isGoldenHour(now?: Date | string) {
  const hour = nairobiHour(now);
  return hour >= GOLDEN_START_HOUR && hour < GOLDEN_END_HOUR;
}

export function goldenRankBonus(
  presence: "active" | "recent" | "offline",
  goldenHour: boolean,
  pinned = false,
) {
  if (!goldenHour || !pinned) return 0;
  if (presence !== "active") return 0;
  return 0.03;
}

export function goldenMsLeft(now: Date | string = new Date()) {
  const date = typeof now === "string" ? new Date(now) : now;
  if (!isGoldenHour(date)) return 0;
  const hour = nairobiHour(date);
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      minute: "numeric",
    }).format(date),
  );
  const leftMin = (GOLDEN_END_HOUR - hour) * 60 - minute;
  return Math.max(0, leftMin) * 60_000;
}

export function goldenLine(now?: Date | string) {
  if (!isGoldenHour(now)) return "Golden Hour · 8–9pm EAT";
  const ms = goldenMsLeft(now);
  const mins = Math.max(1, Math.ceil(ms / 60_000));
  return `Golden Hour · ${mins}m left`;
}
