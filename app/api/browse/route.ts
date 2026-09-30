import { NextResponse } from "next/server";
import { browseLive } from "@/lib/discovery/live";
import { getCity } from "@/lib/browse/cities";
import { cityFromRequest } from "@/lib/geo/city-cookie";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = cityFromRequest(searchParams.get("city"), request.headers.get("cookie"));
  const q = searchParams.get("q") || "";
  const facet = searchParams.get("facet") || "trending";
  const requested = searchParams.get("gender");
  const gender = requested === "woman" || requested === "man" ? requested : "any";
  const cursor = Number(searchParams.get("cursor") ?? "0") || 0;

  if (!getCity(city)) {
    return NextResponse.json({ error: { code: "not_found", message: "Unknown city." } }, { status: 404 });
  }

  const feed = await browseLive({ city, q, facet, cursor, gender });
  return NextResponse.json({ data: feed });
}
