import { NextResponse } from "next/server";
import { discoverFeedLive } from "@/lib/discovery/live";
import { cityFromRequest } from "@/lib/geo/city-cookie";
import { nearFromRequest } from "@/lib/nairobi/near";
import { campusDeckAccess } from "@/lib/campus/server";
import { CAMPUS_SLUG } from "@/lib/campus/shared";
import { myAgeWindow } from "@/lib/discovery/age-window";

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

  const ageParam = (key: string) => {
    const value = Number(searchParams.get(key));
    return Number.isFinite(value) && value >= 18 && value <= 99 ? value : undefined;
  };
  // Campus deck: verified students of an open campus only. Anyone else gets an empty deck, not the city.
  const campus = searchParams.get("campus");
  if (campus) {
    const access = CAMPUS_SLUG.test(campus) ? await campusDeckAccess(campus) : null;
    if (!access) return NextResponse.json({ data: { items: [], nextCursor: null, campusLocked: true } });
    if (access.ownProfileId) excludeIds.push(access.ownProfileId);
  }

  // Signed in: the age range saved on the account wins (K1 age bands; the database enforces
  // the 30+/18–25 rule either way). Guests use the range from their filters.
  const window = await myAgeWindow();
  const feed = await discoverFeedLive({
    campusSlug: campus,
    minAge: window?.min ?? ageParam("minAge"),
    maxAge: window?.max ?? ageParam("maxAge"),
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
