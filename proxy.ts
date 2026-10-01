import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { COUNTRY_COOKIE } from "@/lib/markets/constants";
import { INVITE_COOKIE, normalizePass } from "@/lib/growth/referral";
import { CITY_COOKIE } from "@/lib/geo/city-cookie";
import { nearestCitySlug } from "@/lib/geo/kenya";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Remember the visitor's country (from Vercel's edge) so prices and markets are local.
  if (!request.cookies.get(COUNTRY_COOKIE)) {
    const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
    if (/^[A-Z]{2}$/.test(country)) {
      response.cookies.set(COUNTRY_COOKIE, country, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    }
  }
  // First visit in Kenya: guess the city from the network location so Mombasa isn't shown Nairobi.
  if (!request.cookies.get(CITY_COOKIE)) {
    const lat = Number(request.headers.get("x-vercel-ip-latitude"));
    const lng = Number(request.headers.get("x-vercel-ip-longitude"));
    const guess = request.headers.get("x-vercel-ip-country") === "KE" ? nearestCitySlug(lat, lng) : null;
    if (guess) {
      response.cookies.set(CITY_COOKIE, guess, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
  }
  // Invite links (/?invite=CODE): keep the code until the visitor signs up.
  const invite = normalizePass(request.nextUrl.searchParams.get("invite") ?? "");
  if (invite.length >= 4) {
    response.cookies.set(INVITE_COOKIE, invite, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
