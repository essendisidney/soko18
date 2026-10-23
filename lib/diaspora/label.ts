/** Labels for Kenyans abroad: "Lives in the UK · from Nairobi", "Visiting from the US, 15 Dec". */

const NAMES: Record<string, string> = { GB: "the UK", US: "the US", AE: "the UAE" };

export function countryName(code: string) {
  const upper = code.toUpperCase();
  if (NAMES[upper]) return NAMES[upper];
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export function shortDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function awayLabel(row: { away_country?: string | null; home_city_name?: string | null; city_name: string; visit_arrives?: string | null }) {
  if (!row.away_country) return undefined;
  const country = countryName(row.away_country);
  if (row.visit_arrives) return `Visiting from ${country}, ${shortDate(row.visit_arrives)}`;
  return `Lives in ${country} · from ${row.home_city_name ?? row.city_name}`;
}
