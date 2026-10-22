/** The database's own limits (00042_limits.sql), as a clear message instead of a generic failure. */
export function dbLimitError(message: string | null | undefined) {
  const text = message ?? "";
  if (text.includes("rate_limited")) {
    return { status: 429, error: { code: "rate_limited", message: "Slow down a little and try again in a minute." } };
  }
  if (text.includes("banned")) {
    return { status: 403, error: { code: "suspended", message: "Your account is suspended." } };
  }
  return null;
}
