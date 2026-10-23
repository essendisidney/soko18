/** Date plan types and helpers that are safe in the browser. */

export type DatePlan = {
  id: string;
  place: string;
  startsAt: string;
  checkInAt: string;
  contactName: string;
  status: "active" | "missed";
  canExtend: boolean;
};

/** `datetime-local` value (local clock) for a Date. */
export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Default check-in: three hours after the date starts. */
export function defaultCheckIn(startsAt: Date) {
  return new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
}

/** "in 2h 15m", "in 5 min", or "now". */
export function untilLabel(iso: string, now = Date.now()) {
  const mins = Math.round((Date.parse(iso) - now) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}
