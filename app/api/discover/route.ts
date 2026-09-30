import { NextResponse } from "next/server";
import { discoverFeedLive } from "@/lib/discovery/live";
import { cityFromRequest } from "@/lib/geo/city-cookie";
import { nearFromRequest } from "@/lib/nairobi/near";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = cityFromRequest(searchParams.get("city"), request.headers.get("cookie"));
  const near = nearFromRequest(city, searchParams.get("near"));
  const requested = searchParams.get("gender");
  const gender = requested === "woman" || requested === "man" ? requested : "any";
  const cursor = Number(searchParams.get("cursor") ?? "0") || 0;
  const intents = (searchParams.get("intent") ?? "").split(",").filter(Boolean);
  const excludeIds = (searchParams.get("exclude") ?? "").split(",").filter(Boolean);
  const impressedIds = (searchParams.get("seen") ?? "").split(",").filter(Boolean);

  const feed = await discoverFeedLive({
    citySlug: city,
    nearArea: near,
    gender,
    intents,
    excludeIds,
    impressedIds,
    cursor,
    limit: 16,
  });

  return NextResponse.json({ data: feed });
}
