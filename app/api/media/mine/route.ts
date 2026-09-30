import { NextResponse } from "next/server";
import { listMyPhotos } from "@/lib/media/remote";

export async function GET() {
  const result = await listMyPhotos();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
