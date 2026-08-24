import { NextResponse } from "next/server";
import { submitBlock } from "@/lib/blocks/submit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await submitBlock(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
