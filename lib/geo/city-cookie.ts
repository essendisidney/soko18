import { cityHomeHref, isKenyaCitySlug } from "@/lib/geo/kenya";

export const CITY_COOKIE = "soko18_city";

export function parseCityCookie(value?: string | null) {
  if (!value) return "nairobi";
  try {
    const slug = decodeURIComponent(value).trim().toLowerCase();
    return isKenyaCitySlug(slug) ? slug : "nairobi";
  } catch {
    return "nairobi";
  }
}

export function cityCookieFromHeader(header?: string | null) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === CITY_COOKIE) return rest.join("=");
  }
  return null;
}

/** Query city wins when it is Kenya. Otherwise the snapped cookie. */
export function cityFromRequest(searchCity?: string | null, cookieHeader?: string | null) {
  const queried = searchCity?.trim().toLowerCase();
  if (queried && isKenyaCitySlug(queried)) return queried;
  return parseCityCookie(cityCookieFromHeader(cookieHeader));
}

/** /browse follows the snapped city. Unset or unknown becomes Nairobi. */
export function browseHomeFromCookie(value?: string | null) {
  return cityHomeHref(parseCityCookie(value));
}

/** Categories are Nairobi grids. Other snaps go to their city door. */
export function categoryHrefFromCookie(value?: string | null) {
  const city = parseCityCookie(value);
  return city === "nairobi" ? null : cityHomeHref(city);
}

export function writeCityCookie(slug: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${CITY_COOKIE}=${parseCityCookie(slug)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
