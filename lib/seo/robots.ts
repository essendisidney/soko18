/** Nairobi live surfaces. Waitlist cities are noindex doors, not crawl targets. */
export function crawlAllow() {
  return ["/", "/nairobi", "/browse", "/category/", "/profile/", "/terms", "/privacy", "/safety"];
}

export function crawlDisallow() {
  return ["/admin", "/studio", "/messages", "/login", "/signup", "/dev", "/settings", "/me", "/matches"];
}
