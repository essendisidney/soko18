import { NextResponse } from "next/server";
import { loadRatings, submitRating } from "@/lib/ratings/submit";

export async function GET(request: Request) {
  const profileId = new URL(request.url).searchParams.get("profileId") ?? "";
  const result = await loadRatings(profileId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await submitRating(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data }, { status: 201 });
}
