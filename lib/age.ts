export const MIN_AGE = 18;
export const MIN_BIRTH_DATE = "1940-01-01";

function ymd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function adultCutoff(now = new Date()) {
  return new Date(now.getFullYear() - MIN_AGE, now.getMonth(), now.getDate());
}

export function ageGateMaxDate(now = new Date()) {
  return ymd(adultCutoff(now));
}

export function isAdultBirthDate(value: string, now = new Date()) {
  const born = parseDateInput(value);
  if (!born || born > now) return false;
  return born <= adultCutoff(now);
}

export function maxAdultBirthYear(now = new Date()) {
  return now.getFullYear() - MIN_AGE;
}
