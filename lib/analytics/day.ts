export function nairobiDay(now: Date | string = new Date()) {
  const date = typeof now === "string" ? new Date(now) : now;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDay(day: string, delta: number) {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + delta));
  return next.toISOString().slice(0, 10);
}

export function nairobiRangeStart(day: string, hour = "00:00:00.000") {
  return `${day}T${hour}+03:00`;
}
