import { WAITLIST_CITIES } from "@/lib/data/nairobi";
import { cityHomeHref, citySlugFromPath } from "@/lib/geo/kenya";

export function browseTabHref(pathname: string, storedCity = "nairobi") {
  return cityHomeHref(citySlugFromPath(pathname) ?? (storedCity || "nairobi"));
}

export function isBrowsePath(pathname: string) {
  return (
    pathname === "/nairobi" ||
    pathname.startsWith("/nairobi/") ||
    pathname === "/browse" ||
    pathname.startsWith("/category/") ||
    WAITLIST_CITIES.some((city) => pathname === `/${city.slug}` || pathname.startsWith(`/${city.slug}/`)) ||
    pathname.startsWith("/city/")
  );
}

export function isBrowseHref(href: string) {
  if (href === "/nairobi" || href === "/browse") return true;
  return WAITLIST_CITIES.some((city) => href === `/${city.slug}`);
}

export function tabActive(href: string, pathname: string, returnTo?: string | null) {
  if (pathname.startsWith("/profile/")) {
    const hub =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/profile/")
        ? returnTo
        : "/discover";
    return tabActive(href, hub);
  }
  if (isBrowseHref(href)) {
    return isBrowsePath(pathname);
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
      pathname.startsWith("/blocked/") ||
      pathname === "/notify" ||
      pathname.startsWith("/notify/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
