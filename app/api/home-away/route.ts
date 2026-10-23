import { NextResponse } from "next/server";
import { myHomeAway, updateHomeAway } from "@/lib/diaspora/home-away";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await myHomeAway();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  const result = await updateHomeAway(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
