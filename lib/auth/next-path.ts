/** Only allow same-origin relative paths. */
export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/discover";
  }
  return value;
}
