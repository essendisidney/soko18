import { NextResponse } from "next/server";
import { campusOverview, leaveCampus, setCampusBadge } from "@/lib/campus/server";

export async function GET() {
  const result = await campusOverview();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function PATCH(request: Request) {
  const result = await setCampusBadge(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}

export async function DELETE() {
  const result = await leaveCampus();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
