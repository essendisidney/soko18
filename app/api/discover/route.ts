import { NextResponse } from "next/server";
import { getDiscoverFeed } from "@/lib/discovery/feed";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "nairobi";
  const near = searchParams.get("near") || "kilimani";
  const gender = searchParams.get("gender") === "woman" ? "woman" : searchParams.get("gender") === "any" ? "any" : "man";
  const cursor = Number(searchParams.get("cursor") ?? "0") || 0;
  const intents = (searchParams.get("intent") ?? "").split(",").filter(Boolean);
  const excludeIds = (searchParams.get("exclude") ?? "").split(",").filter(Boolean);
  const impressedIds = (searchParams.get("seen") ?? "").split(",").filter(Boolean);

  const feed = getDiscoverFeed({
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
