import { NextResponse } from "next/server";
import { listFavorites, submitFavorite } from "@/lib/favorites/submit";

export async function GET() {
  const result = await listFavorites();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await submitFavorite(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
