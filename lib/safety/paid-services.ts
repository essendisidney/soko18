/**
 * Same patterns as `private.looks_like_paid_service` in the database.
 * The app checks first so members get a clear message; the database is the backstop.
 */
const PATTERNS: RegExp[] = [
  /\b(escorts?|call ?girl|incall|outcall|in-call|out-call)\b/i,
  /\b(happy ending|nuru|body ?to ?body|b2b)\b/i,
  /\b(short ?time|long ?time|short ?call|long ?call)\b/i,
  /\b(rates?|charges?|price ?list|pricing)\b.{0,40}\b(hour|hr|hrs|night|shot|round|session|visit)s?\b/i,
  /(ksh|kes|sh\.?|bob|\$|usd)\s*\d[\d,.]*\s*k?\s*(per|\/|a|an|for)\s*(hour|hr|night|shot|round|session)/i,
  /\d[\d,.]*\s*k?\s*(bob|ksh|kes)?\s*(per|\/)\s*(hour|hr|night|shot|round|session)/i,
  /\b(send|pay)\s*(fare|deposit|mpesa|m-pesa)\s*first\b/i,
  /\b(fare|deposit)\s*first\b/i,
  /\bsponsor\s*(wanted|needed|available)\b/i,
];

export function looksLikePaidService(text: string | null | undefined) {
  const value = text ?? "";
  return PATTERNS.some((pattern) => pattern.test(value));
}

export const PAID_SERVICE_MESSAGE =
  "Kutana is for dating, not selling. Profiles and messages about rates, fees or paid meetups aren’t allowed.";
