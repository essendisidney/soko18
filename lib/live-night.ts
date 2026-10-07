/**
 * Live swipe night: once a week everyone swipes at the same time, so a small community
 * feels busy. Free, never a paid perk. Sundays 20:00–22:00 Nairobi time (EAT, UTC+3, no DST).
 */

export const LIVE_NIGHT = {
  /** 0 = Sunday, in Nairobi time. */
  weekday: 0,
  startHour: 20,
  hours: 2,
  /** Nairobi is UTC+3 all year. */
  utcOffsetHours: 3,
  label: "Sunday 8–10pm",
} as const;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type LiveNight = {
  /** True while the night is on. */
  live: boolean;
  /** Start of the current night if live, otherwise the next one. */
  start: Date;
  end: Date;
};

/** The current live night, or the next one if none is on. */
export function liveNight(now: Date = new Date()): LiveNight {
  const offset = LIVE_NIGHT.utcOffsetHours * HOUR;
  // Work in "Nairobi wall clock as if it were UTC" so getUTC* read local values.
  const local = new Date(now.getTime() + offset);
  const startToday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), LIVE_NIGHT.startHour);
  const daysAhead = (LIVE_NIGHT.weekday - local.getUTCDay() + 7) % 7;
  let startLocal = startToday + daysAhead * DAY;
  const length = LIVE_NIGHT.hours * HOUR;
  // Today is the day but the night already ended: next week.
  if (local.getTime() >= startLocal + length) startLocal += 7 * DAY;
  const start = new Date(startLocal - offset);
  const end = new Date(start.getTime() + length);
  return { live: now >= start && now < end, start, end };
}

/** "2h 05m", "45m", "under a minute". */
export function countdown(ms: number): string {
  if (ms < 60_000) return "under a minute";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

/** A calendar file that repeats every week, so people can set their own reminder. */
export function liveNightIcs(origin: string, now: Date = new Date()): string {
  const { start, end } = liveNight(now);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kutana//Live swipe night//EN",
    "BEGIN:VEVENT",
    "UID:live-swipe-night@kutana",
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    "RRULE:FREQ=WEEKLY",
    "SUMMARY:Kutana live swipe night",
    `DESCRIPTION:Everyone swipes at once. Open Kutana: ${origin}/discover`,
    `URL:${origin}/discover`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Live swipe night starts soon",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
