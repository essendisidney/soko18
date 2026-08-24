import { NextResponse } from "next/server";
import { getStudioOverview } from "@/lib/studio/overview";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await getStudioOverview(searchParams.get("profileId"));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
