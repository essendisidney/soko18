import { WAITLIST_CITIES } from "@/lib/data/nairobi";

export function tabActive(href: string, pathname: string) {
  if (href === "/nairobi") {
    return (
      pathname === "/nairobi" ||
      pathname.startsWith("/nairobi/") ||
      pathname === "/browse" ||
      pathname.startsWith("/category/") ||
      WAITLIST_CITIES.some(
        (city) => pathname === `/${city.slug}` || pathname.startsWith(`/${city.slug}/`),
      ) ||
      pathname.startsWith("/city/")
    );
  }
  if (href === "/matches") {
    return (
      pathname === "/matches" ||
      pathname.startsWith("/matches/") ||
      pathname === "/messages" ||
      pathname.startsWith("/messages/")
    );
  }
  if (href === "/me") {
    return (
      pathname === "/me" ||
      pathname.startsWith("/me/") ||
      pathname === "/saved" ||
      pathname.startsWith("/saved/") ||
      pathname === "/settings" ||
      pathname.startsWith("/settings/") ||
      pathname === "/studio" ||
      pathname.startsWith("/studio/") ||
      pathname === "/intent" ||
      pathname.startsWith("/intent/") ||
      pathname === "/blocked" ||
      pathname.startsWith("/blocked/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
