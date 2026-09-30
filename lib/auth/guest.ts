import { cityNameBySlug } from "@/lib/geo/kenya";

/** Guest wall. Names the snapped city — never stamp Nairobi on Kisumu. */
export function guestBrowseLine(citySlug = "nairobi") {
  return `You can keep browsing ${cityNameBySlug(citySlug)} as a guest.`;
}

export function guestAuthLine(citySlug = "nairobi") {
  return `Discover as a guest in ${cityNameBySlug(citySlug)}. Sign in to like, Super Like, or message.`;
}
