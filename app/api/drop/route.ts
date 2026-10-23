import { NextResponse } from "next/server";
import { myDrop } from "@/lib/drop/drop";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await myDrop();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: result.data });
}
