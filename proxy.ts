import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { COUNTRY_COOKIE } from "@/lib/markets/constants";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Remember the visitor's country (from Vercel's edge) so prices and markets are local.
  if (!request.cookies.get(COUNTRY_COOKIE)) {
    const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
    if (/^[A-Z]{2}$/.test(country)) {
      response.cookies.set(COUNTRY_COOKIE, country, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
