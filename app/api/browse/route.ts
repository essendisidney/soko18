import { NextResponse } from "next/server";
import { browseFeed } from "@/lib/browse/feed";
import { getCity } from "@/lib/browse/cities";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "nairobi";
  const q = searchParams.get("q") || "";
  const facet = (searchParams.get("facet") || "trending") as Parameters<
    typeof browseFeed
  >[0]["facet"];
  const cursor = Number(searchParams.get("cursor") ?? "0") || 0;

  if (!getCity(city)) {
    return NextResponse.json({ error: { code: "not_found", message: "Unknown city." } }, { status: 404 });
  }

  const feed = browseFeed({ city, q, facet, cursor });
  return NextResponse.json({ data: feed });
}
